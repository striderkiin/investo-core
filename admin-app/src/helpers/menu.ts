import { MENU_ITEMS } from '@/assets/data/menu-items'
import type { MenuItemType } from '@/types/menu'
import type { Permission } from '../../../src/types/roles'

// Filters out items the signed-in admin's role can't use, then any section
// title left with nothing under it.
export const getMenuItems = (can: (permission: Permission) => boolean = () => true): MenuItemType[] => {
  const isVisible = (item: MenuItemType) =>
    !item.permission || (Array.isArray(item.permission) ? item.permission.some((p) => can(p)) : can(item.permission))
  const visible = MENU_ITEMS.flatMap((item): MenuItemType[] => {
    if (!isVisible(item)) return []
    if (!item.children) return [item]
    const children = item.children.filter(isVisible)
    return children.length > 0 ? [{ ...item, children }] : []
  })
  return visible.filter((item, index) => !item.isTitle || (visible[index + 1] !== undefined && !visible[index + 1].isTitle))
}

export const findAllParent = (menuItems: MenuItemType[], menuItem: MenuItemType): string[] => {
  let parents: string[] = []
  const parent = findMenuItem(menuItems, menuItem.parentKey)
  if (parent) {
    parents.push(parent.key)
    if (parent.parentKey) {
      parents = [...parents, ...findAllParent(menuItems, parent)]
    }
  }
  return parents
}

export const getMenuItemFromURL = (items: MenuItemType | MenuItemType[], url: string): MenuItemType | undefined => {
  if (items instanceof Array) {
    for (const item of items) {
      const foundItem = getMenuItemFromURL(item, url)
      if (foundItem) {
        return foundItem
      }
    }
  } else {
    if (items.url == url) return items
    if (items.children) {
      const found = getMenuItemFromURL(items.children, url)
      if (found) return found
    }
  }
}

export const findMenuItem = (menuItems: MenuItemType[] | undefined, menuItemKey: MenuItemType['key'] | undefined): MenuItemType | null => {
  if (menuItems && menuItemKey) {
    for (const item of menuItems) {
      if (item.key === menuItemKey) {
        return item
      }
      const found = findMenuItem(item.children, menuItemKey)
      if (found) return found
    }
  }
  return null
}
