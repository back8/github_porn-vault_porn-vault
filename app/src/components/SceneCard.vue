<template>
  <v-card v-if="scene" outlined>
    <a :href="`#/scene/${scene._id}`">
      <v-img aspect-ratio="1" class="hover" v-ripple eager :src="thumbnail"></v-img>
    </a>

    <div class="corner-actions">
      <v-btn class="elevation-2 mb-2" @click="favorite" icon style="background: #fafafa;">
        <v-icon
          :color="scene.favorite ? 'red' : 'black'"
        >{{ scene.favorite ? 'mdi-heart' : 'mdi-heart-outline' }}</v-icon>
      </v-btn>
      <br />
      <v-btn class="elevation-2" @click="bookmark" icon style="background: #fafafa;">
        <v-icon color="black">{{ scene.bookmark ? 'mdi-bookmark-check' : 'mdi-bookmark-outline' }}</v-icon>
      </v-btn>
    </div>

    <v-card-title>{{ scene.name }}</v-card-title>
    <v-card-subtitle class="pb-1">Featuring {{ actorNames }}</v-card-subtitle>
    <v-rating
      half-increments
      @input="rate"
      class="ml-3 mb-2"
      :value="scene.rating / 2"
      background-color="grey"
      color="amber"
      dense
    ></v-rating>
    <div class="pa-2">
      <v-chip
        class="mr-1 mb-1"
        small
        outlined
        v-for="label in labelNames"
        :key="label"
      >{{ label }}</v-chip>
    </div>
  </v-card>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import ApolloClient, { serverBase } from "../apollo";
import gql from "graphql-tag";

@Component
export default class SceneCard extends Vue {
  @Prop(Object) scene!: any;

  rate($event) {
    const rating = $event * 2;

    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: SceneUpdateOpts!) {
          updateScenes(ids: $ids, opts: $opts) {
            rating
          }
        }
      `,
      variables: {
        ids: [this.scene._id],
        opts: {
          rating
        }
      }
    }).then(res => {
      this.$emit("rate", res.data.updateScenes[0].rating);
    });
  }

  favorite() {
    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: SceneUpdateOpts!) {
          updateScenes(ids: $ids, opts: $opts) {
            favorite
          }
        }
      `,
      variables: {
        ids: [this.scene._id],
        opts: {
          favorite: !this.scene.favorite
        }
      }
    }).then(res => {
      this.$emit("favorite", res.data.updateScenes[0].favorite);
    });
  }

  bookmark() {
    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: SceneUpdateOpts!) {
          updateScenes(ids: $ids, opts: $opts) {
            bookmark
          }
        }
      `,
      variables: {
        ids: [this.scene._id],
        opts: {
          bookmark: !this.scene.bookmark
        }
      }
    }).then(res => {
      this.$emit("bookmark", res.data.updateScenes[0].bookmark);
    });
  }

  get labelNames() {
    return this.scene.labels.map(l => l.name).sort();
  }

  get actorNames() {
    const names = this.scene.actors.map(a => a.name);
    names.sort();
    return names.join(", ");
  }

  get thumbnail() {
    if (this.scene.thumbnail)
      return `${serverBase}/image/${
        this.scene.thumbnail._id
      }?password=${localStorage.getItem("password")}`;
    return "";
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