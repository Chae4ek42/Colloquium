import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { STATEMENTS, activeSource, getStatement, selectSource } from '../../src/data/math/bank.ts'
import { chainOf, layoutCourse } from '../../src/features/math/graph-model.ts'

describe('граф зависимостей', () => {
  it('берёт рёбра только из dependsOn и различает учебники', () => {
    const previous = activeSource().id
    try {
      selectSource('f1-lectures')
      const lectures = layoutCourse()
      assert.ok(lectures.nodes.length > 10)
      assert.deepEqual(
        [...(lectures.incoming.get('thm-2.11') ?? [])].sort(),
        ['def-2.6-1', 'lem-2.3', 'thm-2.9'].sort(),
      )
      for (const edge of lectures.edges) {
        const target = getStatement(edge.to)
        assert.ok(target)
        assert.equal(target.dependsOn.includes(edge.from), true)
      }
      const mentionOnly = STATEMENTS.find(
        (item) => item.mentions.length > 0 && item.dependsOn.length === 0 && item.mentions.some((id) => getStatement(id)),
      )
      if (mentionOnly) {
        assert.equal(lectures.incoming.has(mentionOnly.id), false)
      }
      const cauchyChain = chainOf(lectures, 'thm-2.11')
      assert.equal(cauchyChain.has('def-2.6-1'), true)
      assert.equal(cauchyChain.has('thm-2.11'), true)

      selectSource('gusev-2026')
      const gusev = layoutCourse()
      assert.ok(gusev.nodes.length > 10)
      assert.ok(gusev.nodes.length < STATEMENTS.length)
      assert.deepEqual(
        [...(gusev.incoming.get('thm-9.1-6') ?? [])].sort(),
        ['def-9.1-5', 'thm-9-3'],
      )
      assert.equal(gusev.nodes.some((node) => node.id === 'thm-2.9'), false)
      assert.equal(gusev.nodes.some((node) => node.id === 'def-9.1-5'), true)
      const axiom = gusev.nodes.find((node) => node.id === 'ax-3-16')
      const cauchyNode = gusev.nodes.find((node) => node.id === 'thm-9.1-6')
      assert.ok(axiom && cauchyNode && axiom.y < cauchyNode.y)
      for (const node of gusev.nodes) {
        assert.equal(Number.isFinite(node.x), true)
        assert.equal(Number.isFinite(node.y), true)
      }
    } finally {
      selectSource(previous)
    }
  })
})
