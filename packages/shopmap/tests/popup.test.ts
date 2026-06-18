import { describe, it, expect } from 'vitest'
import { renderTemplate } from '../src/core/popup.js'

describe('renderTemplate', () => {
  it('replaces a single token', () => {
    const result = renderTemplate('Hello {{name}}', { name: 'Acme' })
    expect(result).toBe('Hello Acme')
  })

  it('replaces multiple tokens', () => {
    const result = renderTemplate('{{name}} — {{address}}', {
      name: 'Acme Store',
      address: '123 Main St',
    })
    expect(result).toBe('Acme Store — 123 Main St')
  })

  it('replaces the same token multiple times', () => {
    const result = renderTemplate('{{name}} and {{name}}', { name: 'Shop' })
    expect(result).toBe('Shop and Shop')
  })

  it('leaves unknown tokens as empty string', () => {
    const result = renderTemplate('{{missing}} value', {})
    expect(result).toBe(' value')
  })

  it('handles template with no tokens', () => {
    const result = renderTemplate('No tokens here', { name: 'irrelevant' })
    expect(result).toBe('No tokens here')
  })

  it('handles empty template', () => {
    const result = renderTemplate('', { name: 'x' })
    expect(result).toBe('')
  })

  it('replaces tokens in HTML template', () => {
    const template = `<div class="smap-popup__name">{{name}}</div><div class="smap-popup__address">{{address}}</div>`
    const result = renderTemplate(template, { name: 'Coffee Co', address: '42 Bean St' })
    expect(result).toContain('Coffee Co')
    expect(result).toContain('42 Bean St')
    expect(result).not.toContain('{{name}}')
    expect(result).not.toContain('{{address}}')
  })

  it('handles tokens with only partial data provided', () => {
    const template = `<div>{{name}}</div><div>{{hours}}</div>`
    const result = renderTemplate(template, { name: 'My Shop' })
    expect(result).toContain('My Shop')
    expect(result).toContain('<div></div>')
  })
})
