<template>
  <div
    @click="$emit('index', null)"
    v-if="currentImage"
    style="flex-direction: column; z-index: 999; position: fixed; top:0;left:0; width: 100%; height: 100%; background: #000000aa"
    class="d-flex"
  >
    <div style="position: relative; width: 100%; height: 100%;">
      <v-img contain class="image" :src="imageLink(currentImage)"></v-img>

      <v-btn
        outlined
        color="white"
        large
        v-if="index > 0"
        icon
        class="thumb-btn left"
        @click.stop="$emit('index', index - 1)"
      >
        <v-icon color="white">mdi-chevron-left</v-icon>
      </v-btn>
      <v-btn
        outlined
        color="white"
        large
        v-if="index < items.length - 1"
        icon
        class="thumb-btn right"
        @click.stop="$emit('index', index + 1)"
      >
        <v-icon color="white">mdi-chevron-right</v-icon>
      </v-btn>
    </div>

    <div v-if="!showImageDetails" class="text-center py-3">
      <v-btn @click.stop="showImageDetails = true" text color="white" class="text-none">Show details</v-btn>
    </div>

    <v-card tile style="align-self: flex-end; width: 100%;" @click.native.stop v-else>
      <v-toolbar>
        <v-btn @click="favorite" class="mr-1" icon>
          <v-icon
            :color="currentImage.favorite ? 'red' : 'black'"
          >{{ currentImage.favorite ? 'mdi-heart' : 'mdi-heart-outline' }}</v-icon>
        </v-btn>

        <v-btn @click="bookmark" icon>
          <v-icon
            color="black"
          >{{ currentImage.bookmark ? 'mdi-bookmark-check' : 'mdi-bookmark-outline' }}</v-icon>
        </v-btn>
        <v-spacer></v-spacer>
        <v-btn @click="showImageDetails = false" class="mr-1" icon>
          <v-icon>mdi-chevron-down</v-icon>
        </v-btn>
        <v-btn :href="imageLink(currentImage)" target="_blank" class="mr-1" icon>
          <v-icon>mdi-link</v-icon>
        </v-btn>
        <v-btn @click="openRemoveDialog" icon>
          <v-icon color="black">mdi-delete-forever</v-icon>
        </v-btn>
      </v-toolbar>
      <v-card-title class="subtitle-1">{{ currentImage.name }}</v-card-title>
      <v-card-text>
        <div>
          <v-rating
            half-increments
            @input="rate"
            class="pa-2"
            :value="currentImage.rating / 2"
            background-color="grey"
            color="amber"
            dense
          ></v-rating>
        </div>
        <div class="pa-2">
          <v-chip
            class="mr-1 mb-1"
            label
            small
            outlined
            v-for="label in currentImage.labels"
            :key="label._id"
          >{{ label.name }}</v-chip>
          <v-chip
            label
            color="accent"
            v-ripple
            @click="openLabelSelector"
            small
            class="mr-1 mb-1 hover"
          >+ Add</v-chip>
        </div>
        <div class="d-flex mt-2">
          <div
            class="d-inline-block mr-2 text-center"
            v-for="actor in currentImage.actors"
            :key="actor._id"
          >
            <a :href="`#/actor/${actor._id}`">
              <v-avatar size="80">
                <v-img class="hover" v-ripple eager :src="thumbnail(actor)"></v-img>
              </v-avatar>
            </a>
            <div class="mt-2">{{ actor.name }}</div>
          </div>
          <v-row class="ml-2" align="center">
            <v-btn small text @click="openEditActorsDialog">Edit actors</v-btn>
          </v-row>
        </div>
      </v-card-text>
    </v-card>

    <v-dialog scrollable v-model="labelSelectorDialog" max-width="400px">
      <v-card :loading="labelEditLoader" v-if="currentImage">
        <v-card-title>Select labels for '{{ currentImage.name }}'</v-card-title>

        <v-card-text style="max-height: 400px">
          <LabelSelector :items="allLabels" v-model="selectedLabels" />
        </v-card-text>
        <v-divider></v-divider>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="editLabels" depressed color="primary" class="black--text text-none">Edit</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="removeDialog" max-width="400px">
      <v-card>
        <v-card-title>Really delete '{{ currentImage.name }}'?</v-card-title>
        <v-card-text>Actors and scenes featuring this image will stay in your collection.</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text color="error" @click="$emit('delete', index); removeDialog = false">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="editActorsDialog" max-width="400px">
      <v-card>
        <v-card-title>Edit actors</v-card-title>
        <v-card-text>
          <ActorSelector v-model="editActors" />
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            @click="editImageActors"
            color="primary"
            class="black--text text-none"
            depressed
          >Edit</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch, Prop } from "vue-property-decorator";
import ApolloClient, { serverBase } from "../apollo";
import gql from "graphql-tag";
import LabelSelector from "../components/LabelSelector.vue";
import InfiniteLoading from "vue-infinite-loading";
import { contextModule } from "../store/context";
import ImageCard from "../components/ImageCard.vue";
import actorFragment from "../fragments/actor";
import ActorSelector from "../components/ActorSelector.vue";

@Component({
  components: {
    LabelSelector,
    InfiniteLoading,
    ImageCard,
    ActorSelector
  }
})
export default class Lightbox extends Vue {
  @Prop(Array) items!: any[];
  @Prop() index!: number | null;
  showImageDetails = false;

  labelSelectorDialog = false;
  allLabels = [] as any[];
  selectedLabels = [] as number[];
  labelEditLoader = false;

  editActorsDialog = false;
  editActors = [] as any[];

  removeDialog = false;

  editImageActors() {
    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: ImageUpdateOpts!) {
          updateImages(ids: $ids, opts: $opts) {
            _id
          }
        }
      `,
      variables: {
        ids: [this.currentImage._id],
        opts: {
          actors: this.editActors.map(a => a._id)
        }
      }
    }).then(res => {
      this.$emit("update", {
        index: this.index,
        key: "actors",
        value: this.editActors
      });
      this.editActorsDialog = false;
    });
  }

  openEditActorsDialog() {
    this.editActors = JSON.parse(JSON.stringify(this.currentImage.actors));
    this.editActorsDialog = true;
  }

  openRemoveDialog() {
    this.removeDialog = true;
  }

  @Watch("showImageDetails")
  onToggleDetails() {
    this.selectedLabels = [];
  }

  @Watch("index")
  onIndexChange(newVal: number) {
    this.selectedLabels = [];

    if (this.items[newVal]) {
      this.selectedLabels = this.items[newVal].labels.map(l =>
        this.allLabels.findIndex(k => k._id == l._id)
      );
    }
  }

  rate(rating: number) {
    rating = rating * 2;

    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: ImageUpdateOpts!) {
          updateImages(ids: $ids, opts: $opts) {
            rating
          }
        }
      `,
      variables: {
        ids: [this.currentImage._id],
        opts: {
          rating
        }
      }
    }).then(res => {
      this.$emit("update", {
        index: this.index,
        key: "rating",
        value: rating
      });
    });
  }

  favorite() {
    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: ImageUpdateOpts!) {
          updateImages(ids: $ids, opts: $opts) {
            favorite
          }
        }
      `,
      variables: {
        ids: [this.currentImage._id],
        opts: {
          favorite: !this.currentImage.favorite
        }
      }
    })
      .then(res => {
        this.$emit("update", {
          index: this.index,
          key: "favorite",
          value: res.data.updateImages[0].favorite
        });
      })
      .catch(err => {
        console.error(err);
      });
  }

  bookmark() {
    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: ImageUpdateOpts!) {
          updateImages(ids: $ids, opts: $opts) {
            bookmark
          }
        }
      `,
      variables: {
        ids: [this.currentImage._id],
        opts: {
          bookmark: !this.currentImage.bookmark
        }
      }
    })
      .then(res => {
        this.$emit("update", {
          index: this.index,
          key: "bookmark",
          value: res.data.updateImages[0].bookmark
        });
      })
      .catch(err => {
        console.error(err);
      });
  }

  editLabels() {
    this.labelEditLoader = true;
    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: ImageUpdateOpts!) {
          updateImages(ids: $ids, opts: $opts) {
            labels {
              _id
              name
            }
          }
        }
      `,
      variables: {
        ids: [this.currentImage._id],
        opts: {
          labels: this.selectedLabels.map(i => this.allLabels[i]).map(l => l._id)
        }
      }
    })
      .then(res => {
        this.$emit("update", {
          index: this.index,
          key: "labels",
          value: res.data.updateImages[0].labels
        });
        this.labelSelectorDialog = false;
      })
      .catch(err => {
        console.error(err);
      })
      .finally(() => {
        this.labelEditLoader = false;
      });
  }

  openLabelSelector() {
    if (!this.allLabels.length) {
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
          this.selectedLabels = this.currentImage.labels.map(l =>
            this.allLabels.findIndex(k => k._id == l._id)
          );
          this.labelSelectorDialog = true;
        })
        .catch(err => {
          console.error(err);
        });
    } else {
      this.labelSelectorDialog = true;
    }
  }

  imageLink(image: any) {
    return `${serverBase}/image/${image._id}?password=${localStorage.getItem(
      "password"
    )}`;
  }

  get currentImage() {
    if (this.index !== null) return this.items[this.index];
    return null;
  }

  thumbnail(actor: any) {
    if (actor.thumbnail)
      return `${serverBase}/image/${
        actor.thumbnail._id
      }?password=${localStorage.getItem("password")}`;
    return "";
  }
}
</script>

<style lang="scss" scoped>
.image {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  max-width: calc(100% - 150px);
  max-height: calc(100% - 20px);
}

.thumb-btn {
  z-index: 1000;

  &.left {
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
  }
  &.right {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
  }
}
</style>