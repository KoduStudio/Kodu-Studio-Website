import {defineType, defineField, defineArrayMember} from 'sanity'
import {CogIcon} from '@sanity/icons/Cog'

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  icon: CogIcon,
  description: 'Shared details used across the site, so they are only written once.',
  fields: [
    defineField({
      name: 'email',
      title: 'Contact email',
      type: 'string',
      description: 'Shown in the contact panel and the footer.',
      validation: (rule) => rule.required().email(),
    }),
    defineField({
      name: 'contactIntro',
      title: 'Contact panel text',
      type: 'text',
      rows: 4,
      description: 'The paragraph in the slide-out contact panel.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'socialLinks',
      title: 'Social links',
      type: 'array',
      description: 'Used in the contact panel and in Elsewhere on the About page.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'socialLink',
          fields: [
            defineField({name: 'label', type: 'string', validation: (rule) => rule.required()}),
            defineField({name: 'url', type: 'url', validation: (rule) => rule.required()}),
          ],
          preview: {select: {title: 'label', subtitle: 'url'}},
        }),
      ],
    }),
  ],
  preview: {prepare: () => ({title: 'Site settings'})},
})
