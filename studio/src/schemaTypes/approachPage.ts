import {defineType, defineField, defineArrayMember} from 'sanity'
import {DocumentIcon} from '@sanity/icons/Document'
import {HelpCircleIcon} from '@sanity/icons/HelpCircle'

export const approachPage = defineType({
  name: 'approachPage',
  title: 'Approach page',
  type: 'document',
  icon: DocumentIcon,
  groups: [
    {name: 'approach', title: 'Approach', default: true},
    {name: 'faq', title: 'FAQs'},
  ],
  fields: [
    defineField({
      name: 'intro',
      title: 'Opening statement',
      type: 'text',
      rows: 5,
      group: 'approach',
      description: 'The large serif paragraph at the top of the page.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'approachHeading',
      title: 'Section heading',
      type: 'string',
      group: 'approach',
      initialValue: 'My Approach',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'steps',
      title: 'Steps',
      type: 'array',
      group: 'approach',
      description: 'Numbered automatically in the order listed here.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'step',
          fields: [
            defineField({name: 'name', type: 'string', validation: (rule) => rule.required()}),
            defineField({name: 'description', type: 'text', rows: 4, validation: (rule) => rule.required()}),
            defineField({
              name: 'tags',
              type: 'array',
              of: [defineArrayMember({type: 'string'})],
              description: 'The small chips under the description.',
            }),
          ],
          preview: {select: {title: 'name', subtitle: 'description'}},
        }),
      ],
      validation: (rule) => rule.min(1),
    }),
    defineField({
      name: 'faqIntro',
      title: 'FAQ introduction',
      type: 'text',
      rows: 4,
      group: 'faq',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'faqs',
      title: 'Questions',
      type: 'array',
      group: 'faq',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'faq',
          icon: HelpCircleIcon,
          fields: [
            defineField({name: 'question', type: 'string', validation: (rule) => rule.required()}),
            defineField({name: 'answer', type: 'text', rows: 6, validation: (rule) => rule.required()}),
          ],
          preview: {select: {title: 'question', subtitle: 'answer'}},
        }),
      ],
      validation: (rule) => rule.min(1),
    }),
  ],
  preview: {prepare: () => ({title: 'Approach page'})},
})
