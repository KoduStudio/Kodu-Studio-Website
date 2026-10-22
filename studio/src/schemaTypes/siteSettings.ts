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
      name: 'contactHeading',
      title: 'Contact panel opening line',
      type: 'string',
      description: 'The first line of the contact panel, set in the full-strength text colour.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'contactIntro',
      title: 'Contact panel text',
      type: 'text',
      rows: 4,
      description: 'The rest of the paragraph, which follows the opening line in a lighter tone.',
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
