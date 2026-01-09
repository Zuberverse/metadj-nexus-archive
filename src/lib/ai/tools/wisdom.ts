/**
 * Wisdom Content Tool
 *
 * Returns full Wisdom content for a specific Thought/Guide/Reflection.
 * Use when users ask about "this essay/guide/reflection" or want a summary.
 *
 * @module lib/ai/tools/wisdom
 */

import { z } from 'zod'
import wisdomContent from '@/data/wisdom-content.json'
import { sanitizeAndValidateToolResult } from '@/lib/ai/tools/utils'

const WISDOM_SIGNOFF_REGEX = /^—\s*metadj\s*$/i

const wisdomContentSchema = z.object({
  section: z
    .enum(['thoughts', 'guides', 'reflections'])
    .describe('Wisdom section to fetch from'),
  id: z
    .string()
    .optional()
    .describe(
      'Optional content id. If omitted, returns a list of available items.'
    ),
})

/**
 * Wisdom Content Tool
 *
 * Returns full Wisdom content for a specific Thought/Guide/Reflection.
 * Use when users ask about "this essay/guide/reflection" or want a summary.
 */
export const getWisdomContent = {
  description:
    'Get Wisdom content (Thoughts, Guides, or Reflections) by section and id. Use to read the full text when users want a summary or refer to the current Wisdom page.',
  inputSchema: wisdomContentSchema,
  execute: async ({
    section,
    id,
  }: {
    section: 'thoughts' | 'guides' | 'reflections'
    id?: string
  }) => {
    const safeId = id?.slice(0, 120)

    if (!safeId) {
      const list =
        section === 'thoughts'
          ? wisdomContent.thoughtsPosts.map((post) => ({
              id: post.id,
              title: post.title,
              excerpt: post.excerpt,
              date: post.date,
            }))
          : section === 'guides'
            ? wisdomContent.guides.map((guide) => ({
                id: guide.id,
                title: guide.title,
                excerpt: guide.excerpt,
                category: guide.category,
                sectionCount: guide.sections.length,
              }))
            : wisdomContent.reflections.map((reflection) => ({
                id: reflection.id,
                title: reflection.title,
                excerpt: reflection.excerpt,
                sectionCount: reflection.sections.length,
              }))

      return sanitizeAndValidateToolResult(
        { section, items: list },
        'getWisdomContent'
      )
    }

    if (section === 'thoughts') {
      const post = wisdomContent.thoughtsPosts.find((p) => p.id === safeId)
      if (!post)
        return sanitizeAndValidateToolResult({ found: false }, 'getWisdomContent')
      const content = post.content.filter(
        (p) => !WISDOM_SIGNOFF_REGEX.test(p.trim())
      )
      return sanitizeAndValidateToolResult(
        {
          found: true,
          section,
          id: post.id,
          title: post.title,
          excerpt: post.excerpt,
          date: post.date,
          content,
        },
        'getWisdomContent'
      )
    }

    if (section === 'guides') {
      const guide = wisdomContent.guides.find((g) => g.id === safeId)
      if (!guide)
        return sanitizeAndValidateToolResult({ found: false }, 'getWisdomContent')
      const sections = guide.sections.map((s) => ({
        heading: s.heading,
        paragraphs: s.paragraphs.filter(
          (p) => !WISDOM_SIGNOFF_REGEX.test(p.trim())
        ),
      }))
      return sanitizeAndValidateToolResult(
        {
          found: true,
          section,
          id: guide.id,
          title: guide.title,
          excerpt: guide.excerpt,
          category: guide.category,
          sections,
        },
        'getWisdomContent'
      )
    }

    const reflection = wisdomContent.reflections.find((r) => r.id === safeId)
    if (!reflection)
      return sanitizeAndValidateToolResult({ found: false }, 'getWisdomContent')
    const sections = reflection.sections.map((s) => ({
      heading: s.heading,
      paragraphs: s.paragraphs.filter(
        (p) => !WISDOM_SIGNOFF_REGEX.test(p.trim())
      ),
    }))

    return sanitizeAndValidateToolResult(
      {
        found: true,
        section,
        id: reflection.id,
        title: reflection.title,
        excerpt: reflection.excerpt,
        sections,
      },
      'getWisdomContent'
    )
  },
}
