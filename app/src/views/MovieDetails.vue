<template>
  <div>
    <div v-if="currentMovie">
      <v-row>
        <v-col cols="12" sm="4" md="4" lg="3" xl="2">
          <v-container>
            <v-hover>
              <template v-slot:default="{ hover }">
                <v-img contain aspect-ratio="1" :src="hover ? backCover : frontCover">
                  <!-- <v-fade-transition>
                    <v-overlay v-if="hover" absolute color="accent">
                      <v-icon x-large>mdi-upload</v-icon>
                    </v-overlay>
                  </v-fade-transition>-->
                </v-img>
              </template>
            </v-hover>
          </v-container>
        </v-col>
        <v-col cols="12" sm="8" md="8" lg="9" xl="10">
          <div v-if="currentMovie.releaseDate">
            <div class="d-flex align-center">
              <v-icon>mdi-calendar</v-icon>
              <v-subheader>Release Date</v-subheader>
            </div>
            <div class="med--text pa-2">{{ releaseDate }}</div>
          </div>

          <div v-if="currentMovie.description">
            <div class="d-flex align-center">
              <v-icon>mdi-text</v-icon>
              <v-subheader>Description</v-subheader>
            </div>
            <div
              class="pa-2 med--text"
              v-if="currentMovie.description"
            >{{ currentMovie.description }}</div>
          </div>

          <div class="d-flex align-center">
            <v-icon>mdi-star</v-icon>
            <v-subheader>Rating</v-subheader>
          </div>
          <v-rating
            half-increments
            class="pa-2 pb-0"
            :value="currentMovie.rating / 2"
            background-color="grey"
            color="amber"
            dense
            hide-details
            readonly
          ></v-rating>
          <div class="d-flex align-center">
            <v-icon>mdi-label</v-icon>
            <v-subheader>Labels</v-subheader>
          </div>
          <div class="pa-2">
            <v-chip
              label
              class="mr-1 mb-1"
              small
              outlined
              v-for="label in labelNames"
              :key="label"
            >{{ label }}</v-chip>
          </div>
          <div class="d-flex align-center">
            <v-icon>mdi-information-outline</v-icon>
            <v-subheader>Info</v-subheader>
          </div>
          <div v-if="scenes.length" class="px-2 pt-2 d-flex align-center">
            <v-subheader>Movie duration</v-subheader>
            {{ movieDuration }}
          </div>
          <div v-if="scenes.length" class="px-2 pb-2 d-flex align-center">
            <v-subheader>Movie size</v-subheader>
            {{ (currentMovie.size /1000/ 1000).toFixed(0) }} MB
          </div>
          <!-- <div class="px-2 pb-2 d-flex align-center">
            <v-subheader>View counter</v-subheader>
            {{ currentMovie.watches.length }}
          </div>
          <div v-if="currentMovie.watches.length" class="px-2 pb-2 d-flex align-center">
            <v-subheader>Last time watched</v-subheader>
            {{ new Date(currentMovie.watches[currentMovie.watches.length - 1]).toLocaleString() }}
          </div>-->
        </v-col>
      </v-row>

      <v-row v-if="scenes.length">
        <v-col cols="12">
          <h1 class="font-weight-light text-center">Scenes</h1>

          <v-row>
            <v-col
              class="pa-1"
              v-for="scene in scenes"
              :key="scene._id"
              cols="12"
              sm="6"
              md="4"
              lg="3"
            >
              <scene-card
                style="height: 100%"
                @rate="rateScene(scene._id, $event)"
                @bookmark="bookmarkScene(scene._id, $event)"
                @favorite="favoriteScene(scene._id, $event)"
                :scene="scene"
              />
            </v-col>
          </v-row>
        </v-col>
      </v-row>

      <v-row v-if="actors.length">
        <v-col cols="12">
          <h1 class="font-weight-light text-center">Starring</h1>

          <v-row>
            <v-col
              class="pa-1"
              v-for="actor in actors"
              :key="actor._id"
              cols="12"
              sm="6"
              md="4"
              lg="3"
            >
              <actor-card
                style="height: 100%"
                @rate="rateActor(actor._id, $event)"
                @bookmark="bookmarkActor(actor._id, $event)"
                @favorite="favoriteActor(actor._id, $event)"
                :actor="actor"
              />
            </v-col>
          </v-row>
        </v-col>
      </v-row>

      <div v-if="images.length">
        <div class="d-flex align-center">
          <v-spacer></v-spacer>
          <h1 class="font-weight-light mr-3">{{ images.length }} Images</h1>
          <v-spacer></v-spacer>
        </div>
        <v-container fluid>
          <v-row>
            <v-col class="pa-1" v-for="(image, index) in images" :key="image._id" cols="6" sm="4">
              <ImageCard @open="lightboxIndex = index" width="100%" height="100%" :image="image">
                <!-- <template v-slot:action>
                  <v-tooltip top>
                    <template v-slot:activator="{ on }">
                      <v-btn
                        v-on="on"
                        @click.native.stop="setAsThumbnail(image._id)"
                        class="elevation-2 mb-2"
                        icon
                        style="background: #fafafa;"
                      >
                        <v-icon>mdi-image</v-icon>
                      </v-btn>
                    </template>
                    <span>Set as scene thumbnail</span>
                  </v-tooltip>
                </template>-->
              </ImageCard>
            </v-col>
          </v-row>

          <transition name="fade">
            <Lightbox
              @delete="removeImage"
              @update="updateImage"
              :items="images"
              :index="lightboxIndex"
              @index="lightboxIndex = $event"
            />
          </transition>
        </v-container>
      </div>
    </div>
    <div v-else class="text-center">
      <p>Loading...</p>
      <v-progress-circular indeterminate></v-progress-circular>
    </div>

    <infinite-loading v-if="currentMovie" :identifier="infiniteId" @infinite="infiniteHandler">
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
import sceneFragment from "../fragments/scene";
import actorFragment from "../fragments/actor";
import imageFragment from "../fragments/image";
import SceneCard from "../components/SceneCard.vue";
import ActorCard from "../components/ActorCard.vue";
import moment from "moment";
import LabelSelector from "../components/LabelSelector.vue";
import Lightbox from "../components/Lightbox.vue";
import ImageCard from "../components/ImageCard.vue";
import InfiniteLoading from "vue-infinite-loading";
import ImageUploader from "../components/ImageUploader.vue";
import { sceneModule } from "../store/scene";
import { actorModule } from "../store/actor";
import IActor from "../types/actor";
import IImage from "../types/image";
import ILabel from "../types/label";
import IScene from "../types/scene";
import { movieModule } from "../store/movie";

@Component({
  components: {
    ActorCard,
    SceneCard,
    LabelSelector,
    Lightbox,
    ImageCard,
    InfiniteLoading,
    ImageUploader
  },
  beforeRouteLeave(_to, _from, next) {
    movieModule.setCurrent(null);
    next();
  }
})
export default class SceneDetails extends Vue {
  actors = [] as IActor[];
  scenes = [] as IScene[];
  images = [] as IImage[];
  lightboxIndex = null as number | null;

  infiniteId = 0;
  page = 0;

  get frontCover() {
    if (this.currentMovie.frontCover)
      return `${serverBase}/image/${
        this.currentMovie.frontCover._id
      }?password=${localStorage.getItem("password")}`;
    return "";
  }

  get backCover() {
    if (this.currentMovie.backCover)
      return `${serverBase}/image/${
        this.currentMovie.backCover._id
      }?password=${localStorage.getItem("password")}`;
    return this.frontCover;
  }

  @Watch("currentMovie.actors", { deep: true })
  onActorChange(newVal: any[]) {
    this.actors = newVal;
  }

  readImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) resolve(reader.result.toString());
        else reject("File error");
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /* async readThumbnail(file: File) {
    if (file) this.thumbnailDisplay = await this.readImage(file);
  } */

  removeImage(index: number) {
    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!) {
          removeImages(ids: $ids)
        }
      `,
      variables: {
        ids: [this.images[index]._id]
      }
    })
      .then(res => {
        this.images.splice(index, 1);
        this.lightboxIndex = null;
      })
      .catch(err => {
        console.error(err);
      })
      .finally(() => {});
  }

  updateImage({
    index,
    key,
    value
  }: {
    index: number;
    key: string;
    value: any;
  }) {
    const images = this.images[index];
    images[key] = value;
    Vue.set(this.images, index, images);
  }

  get currentMovie() {
    return movieModule.current;
  }

  get movieDuration() {
    if (this.currentMovie)
      return moment()
        .startOf("day")
        .seconds(this.currentMovie.duration)
        .format("H:mm:ss");
    return "";
  }

  async fetchPage() {
    if (!this.currentMovie) return;

    try {
      const query = `page:${this.page} sortDir:asc sortBy:addedOn scene:${this.currentMovie._id}`;

      const result = await ApolloClient.query({
        query: gql`
          query($query: String) {
            getImages(query: $query) {
              ...ImageFragment
              actors {
                ...ActorFragment
              }
              scene {
                _id
                name
              }
            }
          }
          ${imageFragment}
          ${actorFragment}
        `,
        variables: {
          query
        }
      });

      return result.data.getImages;
    } catch (err) {
      throw err;
    }
  }

  infiniteHandler($state) {
    this.fetchPage().then(items => {
      if (items.length) {
        this.page++;
        this.images.push(...items);
        $state.loaded();
      } else {
        $state.complete();
      }
    });
  }

  setAsThumbnail(id: string) {
    if (!this.currentMovie) return;

    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: SceneUpdateOpts!) {
          updateScenes(ids: $ids, opts: $opts) {
            thumbnail {
              _id
            }
          }
        }
      `,
      variables: {
        ids: [this.currentMovie._id],
        opts: {
          thumbnail: id
        }
      }
    })
      .then(res => {
        sceneModule.setThumbnail(id);
      })
      .catch(err => {
        console.error(err);
      });
  }

  get releaseDate() {
    if (this.currentMovie && this.currentMovie.releaseDate)
      return new Date(this.currentMovie.releaseDate).toDateString();
    return "";
  }

  imageLink(image: any) {
    return `${serverBase}/image/${image._id}?password=${localStorage.getItem(
      "password"
    )}`;
  }

  rateActor(id: any, rating: number) {
    const index = this.actors.findIndex(sc => sc._id == id);

    if (index > -1) {
      const actor = this.actors[index];
      actor.rating = rating;
      Vue.set(this.actors, index, actor);
    }
  }

  favoriteActor(id: any, favorite: boolean) {
    const index = this.actors.findIndex(sc => sc._id == id);

    if (index > -1) {
      const actor = this.actors[index];
      actor.favorite = favorite;
      Vue.set(this.actors, index, actor);
    }
  }

  bookmarkActor(id: any, bookmark: boolean) {
    const index = this.actors.findIndex(sc => sc._id == id);

    if (index > -1) {
      const actor = this.actors[index];
      actor.bookmark = bookmark;
      Vue.set(this.actors, index, actor);
    }
  }

  get labelNames() {
    if (!this.currentMovie) return "";
    return this.currentMovie.labels.map(l => l.name).sort();
  }

  get thumbnail() {
    if (this.currentMovie && this.currentMovie.thumbnail)
      return `${serverBase}/image/${
        this.currentMovie.thumbnail._id
      }?password=${localStorage.getItem("password")}`;
    return "";
  }

  beforeCreate() {
    ApolloClient.query({
      query: gql`
        query($id: String!) {
          getMovieById(id: $id) {
            _id
            name
            favorite
            bookmark
            rating
            frontCover {
              _id
            }
            backCover {
              _id
            }
            actors {
              ...ActorFragment
            }
            scenes {
              ...SceneFragment
              actors {
                ...ActorFragment
              }
            }
            labels {
              _id
              name
            }
            duration
            size
          }
        }
        ${sceneFragment}
        ${actorFragment}
      `,
      variables: {
        id: (<any>this).$route.params.id
      }
    }).then(res => {
      movieModule.setCurrent(res.data.getMovieById);
      this.scenes = res.data.getMovieById.scenes;
      this.actors = res.data.getMovieById.actors;
    });
  }
}
</script>

<style lang="scss" scoped>
.corner-actions {
  position: absolute;
  top: 5px;
  right: 5px;
}
</style>