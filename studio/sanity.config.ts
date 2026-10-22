import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {schemaTypes} from './src/schemaTypes'
import {structure} from './src/structure'

const singletonTypes = new Set(['siteSettings', 'aboutPage', 'approachPage', 'privacyPage'])

export default defineConfig({
  name: 'default',
  title: 'Kodu Studio',

  projectId: 'ya4b5flc',
  dataset: 'production',

  plugins: [structureTool({structure})],

  schema: {
    types: schemaTypes,
    // Singletons are created once by the content import, so keep them out of the
    // global "create new" menu
    templates: (prev) => prev.filter((t) => !singletonTypes.has(t.schemaType)),
  },

  document: {
    // Nobody should be able to duplicate or delete a page that the site expects to exist
    actions: (prev, {schemaType}) =>
      singletonTypes.has(schemaType)
        ? prev.filter(({action}) => action && !['duplicate', 'delete', 'unpublish'].includes(action))
        : prev,
  },
})
