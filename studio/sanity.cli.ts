import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'ya4b5flc',
    dataset: 'production',
  },
  // where `sanity deploy` publishes the Studio
  studioHost: 'kodustudio',
  deployment: {
    appId: 'd63131mheaszo5vnyvyhsjiv',
  },
})
