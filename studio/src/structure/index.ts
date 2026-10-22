import type {StructureResolver} from 'sanity/structure'
import {CogIcon} from '@sanity/icons/Cog'
import {UserIcon} from '@sanity/icons/User'
import {DocumentIcon} from '@sanity/icons/Document'
import {LockIcon} from '@sanity/icons/Lock'

/**
 * Every type here is a singleton: one document, edited in place. The list view and the
 * "create new" button would only ever be in the way, so the structure opens each one
 * straight into its editor.
 */
const singleton = (S: Parameters<StructureResolver>[0]) => (
  id: string,
  type: string,
  title: string,
  icon: typeof CogIcon,
) =>
  S.listItem()
    .title(title)
    .id(id)
    .icon(icon)
    .child(S.document().schemaType(type).documentId(id).title(title))

export const structure: StructureResolver = (S) => {
  const one = singleton(S)
  return S.list()
    .title('Kodu Studio')
    .items([
      one('aboutPage', 'aboutPage', 'About page', UserIcon),
      one('approachPage', 'approachPage', 'Approach page', DocumentIcon),
      one('privacyPage', 'privacyPage', 'Privacy policy', LockIcon),
      S.divider(),
      one('siteSettings', 'siteSettings', 'Site settings', CogIcon),
    ])
}
