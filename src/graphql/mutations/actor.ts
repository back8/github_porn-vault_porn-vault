import * as database from "../../database";
import Actor from "../../types/actor";
import Scene from "../../types/scene";
import Image from "../../types/image";
import { Dictionary } from "../../types/utility";
import { stripStr } from "../../extractor";
import * as logger from "../../logger";
import { getConfig } from "../../config/index";
import { indices } from "../../search/index";
import { createActorSearchDoc } from "../../search/actor";
import { onActorCreate } from "../../plugin_events/actor";
import { createSceneSearchDoc } from "../../search/scene";
import { createImageSearchDoc } from "../../search/image";

type IActorUpdateOpts = Partial<{
  name: string;
  description: string;
  rating: number;
  labels: string[];
  aliases: string[];
  thumbnail: string;
  favorite: boolean;
  bookmark: boolean;
  bornOn: number;
  customFields: Dictionary<string[] | boolean | string | null>;
}>;

async function runActorPlugins(ids: string[]) {
  const changedActors = [] as Actor[];
  for (const id of ids) {
    let actor = await Actor.getById(id);

    if (actor) {
      logger.message(`Running plugin action event for '${actor.name}'...`);

      const labels = (await Actor.getLabels(actor)).map(l => l._id);
      actor = await onActorCreate(actor, labels, "actorCustom");

      await Actor.setLabels(actor, labels);
      await database.update(database.store.actors, { _id: actor._id }, actor);
      indices.actors.update(actor._id, await createActorSearchDoc(actor));

      changedActors.push(actor);
    } else {
      logger.warn(`Actor ${id} not found`);
    }
  }
  return changedActors;
}

export default {
  async runAllActorPlugins() {
    const ids = (await Actor.getAll()).map(a => a._id);
    return runActorPlugins(ids);
  },

  async runActorPlugins(_, { ids }: { ids: string[] }) {
    return runActorPlugins(ids);
  },

  async addActor(_, args: Dictionary<any>) {
    let actor = new Actor(args.name, args.aliases);
    const config = getConfig();

    let actorLabels = [] as string[];
    if (args.labels) {
      actorLabels = args.labels;
    }

    for (const scene of await Scene.getAll()) {
      const perms = stripStr(scene.path || scene.name);

      if (
        perms.includes(stripStr(actor.name)) ||
        actor.aliases.some(alias => perms.includes(stripStr(alias)))
      ) {
        if (config.APPLY_ACTOR_LABELS === true) {
          const sceneLabels = (await Scene.getLabels(scene)).map(l => l._id);
          await Scene.setLabels(scene, sceneLabels.concat(actorLabels));
          logger.log(`Applied actor labels of new actor to ${scene._id}`);
        }
        await Scene.setActors(
          scene,
          (await Scene.getActors(scene)).map(l => l._id).concat(actor._id)
        );
        indices.scenes.update(scene._id, await createSceneSearchDoc(scene));
        logger.log(`Updated actors of ${scene._id}`);
      }
    }

    for (const image of await Image.getAll()) {
      const perms = stripStr(image.name);

      if (
        perms.includes(stripStr(actor.name)) ||
        actor.aliases.some(alias => perms.includes(stripStr(alias)))
      ) {
        if (config.APPLY_ACTOR_LABELS === true) {
          const imageLabels = (await Image.getLabels(image)).map(l => l._id);
          await Image.setLabels(image, imageLabels.concat(actorLabels));
          logger.log(`Applied actor labels of new actor to ${image._id}`);
        }
        await Image.setActors(
          image,
          (await Image.getActors(image)).map(l => l._id).concat(actor._id)
        );
        // TODO: investigate why this is not working
        // may be fixed with twigs?
        // vvvvvvvvvv
        indices.images.update(image._id, await createImageSearchDoc(image));
        logger.log(`Updated actors of ${image._id}`);
      }
    }

    try {
      actor = await onActorCreate(actor, actorLabels);
    } catch (error) {
      logger.error(error.message);
    }

    await Actor.setLabels(actor, actorLabels);
    await database.insert(database.store.actors, actor);
    indices.actors.add(await createActorSearchDoc(actor));
    return actor;
  },

  async updateActors(
    _,
    { ids, opts }: { ids: string[]; opts: IActorUpdateOpts }
  ) {
    const updatedActors = [] as Actor[];

    for (const id of ids) {
      const actor = await Actor.getById(id);

      if (actor) {
        if (Array.isArray(opts.aliases))
          actor.aliases = [...new Set(opts.aliases)];

        if (Array.isArray(opts.labels))
          await Actor.setLabels(actor, opts.labels);

        if (typeof opts.bookmark == "boolean") actor.bookmark = opts.bookmark;

        if (typeof opts.favorite == "boolean") actor.favorite = opts.favorite;

        if (typeof opts.name == "string") actor.name = opts.name.trim();

        if (typeof opts.description == "string")
          actor.description = opts.description.trim();

        if (typeof opts.thumbnail == "string") actor.thumbnail = opts.thumbnail;

        if (typeof opts.rating == "number") actor.rating = opts.rating;

        if (opts.bornOn !== undefined) actor.bornOn = opts.bornOn;

        if (opts.customFields) {
          for (const key in opts.customFields) {
            const value =
              opts.customFields[key] !== undefined
                ? opts.customFields[key]
                : null;
            logger.log(`Set actor custom.${key} to ${value}`);
            opts.customFields[key] = value;
          }
          actor.customFields = opts.customFields;
        }

        await database.update(database.store.actors, { _id: actor._id }, actor);

        updatedActors.push(actor);
        indices.actors.update(actor._id, await createActorSearchDoc(actor));
      } else {
        throw new Error(`Actor ${id} not found`);
      }
    }

    return updatedActors;
  },

  async removeActors(_, { ids }: { ids: string[] }) {
    for (const id of ids) {
      const actor = await Actor.getById(id);

      if (actor) {
        await Actor.remove(actor);
        indices.actors.remove(actor._id);
        await database.remove(database.store.crossReferences, {
          from: actor._id
        });
        await database.remove(database.store.crossReferences, {
          to: actor._id
        });
      }
    }
    return true;
  }
};
