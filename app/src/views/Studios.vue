<template>
  <div>
    <v-navigation-drawer v-model="drawer" :permanent="$vuetify.breakpoint.mdAndUp" clipped app>
      <v-container>
        <v-text-field clearable color="accent" v-model="query" label="Search query"></v-text-field>

        <v-subheader>Labels</v-subheader>
        <v-chip-group
          active-class="accent--text"
          :items="allLabels"
          column
          v-model="selectedLabels"
          multiple
        >
          <div style="max-height:40vh; overflow-y:scroll">
            <v-chip label small v-for="label in allLabels" :key="label._id">{{ label.name }}</v-chip>
          </div>
        </v-chip-group>
        <v-select
          hide-details
          color="accent"
          item-text="text"
          item-value="value"
          v-model="sortBy"
          placeholder="Sort by..."
          :items="sortByItems"
        ></v-select>
        <v-select
          :disabled="sortBy == 'relevance'"
          hide-details
          color="accent"
          item-text="text"
          item-value="value"
          v-model="sortDir"
          placeholder="Sort direction"
          :items="sortDirItems"
        ></v-select>
        <v-checkbox hide-details v-model="favoritesOnly" label="Show favorites only"></v-checkbox>
        <v-checkbox hide-details v-model="bookmarksOnly" label="Show bookmarks only"></v-checkbox>

        <v-rating
          half-increments
          @input="ratingFilter = $event * 2"
          :value="ratingFilter / 2"
          class="pb-0 pa-2"
          background-color="grey"
          color="amber"
          dense
          hide-details
        ></v-rating>
        <div class="pl-3 mt-1 med--text caption hover" @click="ratingFilter = 0">Reset rating filter</div>
      </v-container>
    </v-navigation-drawer>

    <div v-if="!fetchLoader">
      <div class="d-flex align-center">
        <h1 class="font-weight-light mr-3">Studios</h1>
        <v-btn class="mr-3" @click="openCreateDialog" icon>
          <v-icon>mdi-plus</v-icon>
        </v-btn>
      </div>
      <v-row>
        <v-col
          class="pa-1"
          v-for="studio in studios"
          :key="studio._id"
          cols="12"
          sm="6"
          md="4"
          lg="3"
          xl="2"
        >
          <studio-card :studio="studio" style="height: 100%" />
        </v-col>
      </v-row>
    </div>
    <div v-else class="text-center">
      <p>Loading...</p>
      <v-progress-circular indeterminate></v-progress-circular>
    </div>

    <v-dialog scrollable v-model="createStudioDialog" max-width="400px">
      <v-card :loading="addStudioLoader">
        <v-card-title>Add new studio</v-card-title>
        <v-card-text style="max-height: 90vh">
          <v-form v-model="validCreation">
            <v-text-field
              :rules="studioNameRules"
              color="accent"
              v-model="createStudioName"
              placeholder="Name"
            />
          </v-form>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            text
            class="text-none"
            :disabled="!validCreation"
            color="accent"
            @click="addStudio"
          >Add</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <infinite-loading :identifier="infiniteId" @infinite="infiniteHandler">
      <div slot="no-results">
        <v-icon large>mdi-close</v-icon>
        <div>Nothing found!</div>
      </div>

      <div slot="spinner">
        <v-progress-circular indeterminate></v-progress-circular>
        <div>Loading...</div>
      </div>

      <div slot="no-more">
        <v-icon large>mdi-emoticon-wink</v-icon>
        <div>That's all!</div>
      </div>
    </infinite-loading>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import ApolloClient, { serverBase } from "../apollo";
import gql from "graphql-tag";
import { contextModule } from "../store/context";
import InfiniteLoading from "vue-infinite-loading";
import ILabel from "../types/label";
import studioFragment from "../fragments/studio";
import StudioCard from "../components/StudioCard.vue";

@Component({
  components: {
    InfiniteLoading,
    StudioCard
  }
})
export default class StudioList extends Vue {
  studios = [] as any[];
  fetchLoader = false;

  waiting = false;
  allLabels = [] as ILabel[];
  selectedLabels = [] as number[];

  validCreation = false;
  createStudioDialog = false;
  createStudioName = "";
  labelSelectorDialog = false;
  addStudioLoader = false;

  studioNameRules = [v => (!!v && !!v.length) || "Invalid studio name"];

  query = "";
  page = 0;

  sortDir = "desc";
  sortDirItems = [
    {
      text: "Ascending",
      value: "asc"
    },
    {
      text: "Descending",
      value: "desc"
    }
  ];

  sortBy = "relevance";
  sortByItems = [
    {
      text: "Relevance",
      value: "relevance"
    },
    {
      text: "Added to collection",
      value: "addedOn"
    },
    {
      text: "Rating",
      value: "rating"
    },
    {
      text: "Views",
      value: "views"
    },
    {
      text: "Duration",
      value: "duration"
    }
  ];

  favoritesOnly = false;
  bookmarksOnly = false;
  ratingFilter = 0;

  infiniteId = 0;
  resetTimeout = null as NodeJS.Timeout | null;

  get drawer() {
    return contextModule.showFilters;
  }

  set drawer(val: boolean) {
    contextModule.toggleFilters(val);
  }

  labelIDs(indices: number[]) {
    return indices.map(i => this.allLabels[i]).map(l => l._id);
  }

  labelNames(indices: number[]) {
    return indices.map(i => this.allLabels[i].name);
  }

  addStudio() {
    this.addStudioLoader = true;
    ApolloClient.mutate({
      mutation: gql`
        mutation($name: String!) {
          addStudio(name: $name) {
            ...StudioFragment
          }
        }
        ${studioFragment}
      `,
      variables: {
        name: this.createStudioName
      }
    })
      .then(res => {
        this.studios.unshift(res.data.addStudio);
        this.createStudioDialog = false;
        this.createStudioName = "";
      })
      .catch(() => {})
      .finally(() => {
        this.addStudioLoader = false;
      });
  }

  openCreateDialog() {
    this.createStudioDialog = true;
  }

  /* favorite(id: any, favorite: boolean) {
    const index = this.studios.findIndex(sc => sc._id == id);

    if (index > -1) {
      const studio = this.studios[index];
      studio.favorite = favorite;
      Vue.set(this.studios, index, studio);
    }
  }

  bookmark(id: any, bookmark: boolean) {
    const index = this.studios.findIndex(sc => sc._id == id);

    if (index > -1) {
      const studio = this.studios[index];
      studio.bookmark = bookmark;
      Vue.set(this.studios, index, studio);
    }
  } */

  studioLabels(studio: any) {
    return studio.labels.map(l => l.name).sort();
  }

  @Watch("ratingFilter", {})
  onRatingChange(newVal: number) {
    this.page = 0;
    this.studios = [];
    this.infiniteId++;
  }

  @Watch("favoritesOnly")
  onFavoriteChange() {
    this.page = 0;
    this.studios = [];
    this.infiniteId++;
  }

  @Watch("bookmarksOnly")
  onBookmarkChange() {
    this.page = 0;
    this.studios = [];
    this.infiniteId++;
  }

  @Watch("sortDir")
  onSortDirChange() {
    this.page = 0;
    this.studios = [];
    this.infiniteId++;
  }

  @Watch("sortBy")
  onSortChange() {
    this.page = 0;
    this.studios = [];
    this.infiniteId++;
  }

  @Watch("selectedLabels")
  onLabelChange() {
    this.page = 0;
    this.studios = [];
    this.infiniteId++;
  }

  @Watch("query")
  onQueryChange() {
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
    }

    this.waiting = true;
    this.page = 0;
    this.studios = [];

    this.resetTimeout = setTimeout(() => {
      this.waiting = false;
      this.infiniteId++;
    }, 500);
  }

  infiniteHandler($state) {
    this.fetchPage().then(items => {
      if (items.length) {
        this.page++;
        this.studios.push(...items);
        $state.loaded();
      } else {
        $state.complete();
      }
    });
  }

  async fetchPage() {
    try {
      let include = "";

      if (this.selectedLabels.length)
        include =
          "include:" +
          this.selectedLabels.map(i => this.allLabels[i]._id).join(",");

      const query = `query:'${this.query || ""}' ${include} page:${
        this.page
      } sortDir:${this.sortDir} sortBy:${this.sortBy} favorite:${
        this.favoritesOnly ? "true" : "false"
      } bookmark:${this.bookmarksOnly ? "true" : "false"} rating:${
        this.ratingFilter
      }`;

      const result = await ApolloClient.query({
        query: gql`
          query($query: String) {
            getStudios(query: $query) {
              ...StudioFragment
            }
          }
          ${studioFragment}
        `,
        variables: {
          query
        }
      });

      return result.data.getStudios;
    } catch (err) {
      throw err;
    }
  }

  beforeMount() {
    ApolloClient.query({
      query: gql`
        {
          getLabels {
            _id
            name
            aliases
          }
        }
      `
    })
      .then(res => {
        this.allLabels = res.data.getLabels;
      })
      .catch(err => {
        console.error(err);
      });
  }
}
</script>