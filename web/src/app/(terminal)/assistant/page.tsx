'use client'

import { useEffect, useState } from 'react'
import { readSettings } from '@/components/terminal/settings'
import { PageIntro } from '@/components/terminal/ui'
import { ChatPanel } from '@/components/terminal/ChatPanel'

export default function AssistantPage() {
  const [perp, setPerp] = useState('CLUSDT')
  useEffect(() => setPerp(readSettings().perpSymbol), [])
  return (
    <div>
      <PageIntro kicker="助手" title="AI 研究助手">
        默认不调用外部模型。它把看板上的行情、极端费率、新闻标题、波动和转账整理成引用，再分开写事实、推断和未知。问它收益或下单，会直接拒绝。
      </PageIntro>
      <ChatPanel
        context={{ type: 'digest', perp }}
        prompts={[
          '总结当前看板上能确认的事实',
          '哪些资金费率绝对值超过 0.5%？',
          '有没有已经完成三项核对的异常波动？',
          '大额转账里哪些只是链上观察？',
          '这能保证收益吗？',
        ]}
      />
    </div>
  )
}
