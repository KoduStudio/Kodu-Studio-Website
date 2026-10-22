import {defineType, defineField, defineArrayMember} from 'sanity'
import {LockIcon} from '@sanity/icons/Lock'

export const privacyPage = defineType({
  name: 'privacyPage',
  title: 'Privacy policy',
  type: 'document',
  icon: LockIcon,
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      initialValue: 'Privacy Policy',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'lastUpdated',
      title: 'Last updated',
      type: 'date',
      description: 'Shown under the title. Change this whenever the policy changes.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'sections',
      title: 'Sections',
      type: 'array',
      description: 'Numbered automatically in the order listed here.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'section',
          fields: [
            defineField({name: 'heading', type: 'string', validation: (rule) => rule.required()}),
            defineField({name: 'body', type: 'text', rows: 6, validation: (rule) => rule.required()}),
          ],
          preview: {select: {title: 'heading', subtitle: 'body'}},
        }),
      ],
      validation: (rule) => rule.min(1),
    }),
  ],
  preview: {prepare: () => ({title: 'Privacy policy'})},
})
