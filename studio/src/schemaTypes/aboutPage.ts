import {defineType, defineField, defineArrayMember} from 'sanity'
import {UserIcon} from '@sanity/icons/User'

export const aboutPage = defineType({
  name: 'aboutPage',
  title: 'About page',
  type: 'document',
  icon: UserIcon,
  fields: [
    defineField({
      name: 'intro',
      title: 'Opening statement',
      type: 'text',
      rows: 5,
      description: 'The large serif paragraph at the top of the page.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'body',
      title: 'About me',
      type: 'text',
      rows: 6,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'services',
      title: 'What I do',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      description: 'One per line, listed in order.',
    }),
  ],
  preview: {prepare: () => ({title: 'About page'})},
})
