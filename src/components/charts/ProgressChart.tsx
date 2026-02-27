'use client'

import { useState } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  CartesianGrid,
} from 'recharts'
import type { WeeklyVolume, FeelPoint, DistancePoint, MilestonePin } from '@/lib/analytics/session-trends'

type ChartView = 'volume' | 'feel' | 'distance'

type ProgressChartProps = {
  weeklyVolume: WeeklyVolume[]
  feelTrend: FeelPoint[]
  distanceTimeline: DistancePoint[]
  milestonePins?: MilestonePin[]
  compact?: boolean
}

const FEEL_EMOJI: Record<number, string> = {
  1: '😰', 2: '😐', 3: '🙂', 4: '😊', 5: '🔥',
}

const FEEL_COLORS: Record<number, string> = {
  1: '#EF4444', 2: '#F97316', 3: '#EAB308', 4: '#22C55E', 5: '#14B8A6',
}

function VolumeTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: WeeklyVolume }> }) {
  if (!active || !payload?.[0]) return null
  const data = payload[0].payload
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2 text-xs">
      <p className="font-semibold text-gray-900">Week of {data.weekLabel}</p>
      <p className="text-teal-600">{data.totalKm} km</p>
      <p className="text-gray-500">{data.sessionCount} run{data.sessionCount !== 1 ? 's' : ''}</p>
    </div>
  )
}

function FeelTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: FeelPoint }> }) {
  if (!active || !payload?.[0]) return null
  const data = payload[0].payload
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2 text-xs">
      <p className="font-semibold text-gray-900">{data.dateLabel}</p>
      <p style={{ color: FEEL_COLORS[data.feel] }}>
        {FEEL_EMOJI[data.feel]} Feel: {data.feel}/5
      </p>
    </div>
  )
}

function DistanceTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: DistancePoint }> }) {
  if (!active || !payload?.[0]) return null
  const data = payload[0].payload
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2 text-xs">
      <p className="font-semibold text-gray-900">{data.dateLabel}</p>
      <p className="text-teal-600">{data.distanceKm} km</p>
      <p className="text-gray-500">Total: {data.cumulativeKm} km</p>
    </div>
  )
}

// Custom dot for feel chart that shows color based on feel value
function FeelDot(props: { cx?: number; cy?: number; payload?: FeelPoint }) {
  const { cx, cy, payload } = props
  if (cx == null || cy == null || !payload) return null
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill={FEEL_COLORS[payload.feel] ?? '#9CA3AF'}
      stroke="white"
      strokeWidth={2}
    />
  )
}

export default function ProgressChart({
  weeklyVolume,
  feelTrend,
  distanceTimeline,
  milestonePins = [],
  compact = false,
}: ProgressChartProps) {
  const [view, setView] = useState<ChartView>('volume')

  const hasVolume = weeklyVolume.some(w => w.totalKm > 0)
  const hasFeel = feelTrend.length >= 2
  const hasDistance = distanceTimeline.length >= 2

  const availableViews: { key: ChartView; label: string }[] = [
    ...(hasVolume ? [{ key: 'volume' as ChartView, label: 'Weekly' }] : []),
    ...(hasFeel ? [{ key: 'feel' as ChartView, label: 'Feel' }] : []),
    ...(hasDistance ? [{ key: 'distance' as ChartView, label: 'Progress' }] : []),
  ]

  if (availableViews.length === 0) return null

  // If current view has no data, fall back to first available
  const activeView = availableViews.find(v => v.key === view) ? view : availableViews[0].key

  const height = compact ? 140 : 200

  // Build milestone lookup for distance chart
  const milestoneMap = new Map<string, MilestonePin>()
  for (const pin of milestonePins) {
    milestoneMap.set(pin.date, pin)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
      {/* Chart toggle */}
      {availableViews.length > 1 && (
        <div className="flex gap-1 mb-3">
          {availableViews.map(v => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={`text-[11px] font-semibold px-3 py-1.5 rounded-full transition-colors ${
                activeView === v.key
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      )}

      {/* Volume chart */}
      {activeView === 'volume' && hasVolume && (
        <>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">
            Weekly distance
          </p>
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={weeklyVolume} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis
                dataKey="weekLabel"
                tick={{ fontSize: 10, fill: '#9CA3AF' }}
                tickLine={false}
                axisLine={false}
                interval={compact ? 2 : 1}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#9CA3AF' }}
                tickLine={false}
                axisLine={false}
                width={40}
                unit=" km"
              />
              <Tooltip content={<VolumeTooltip />} cursor={{ fill: 'rgba(13, 148, 136, 0.05)' }} />
              <Bar dataKey="totalKm" fill="#2DD4BF" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </>
      )}

      {/* Feel trend chart */}
      {activeView === 'feel' && hasFeel && (
        <>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">
            How runs felt
          </p>
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={feelTrend} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 10, fill: '#9CA3AF' }}
                tickLine={false}
                axisLine={false}
                interval={Math.max(0, Math.floor(feelTrend.length / 6) - 1)}
              />
              <YAxis
                domain={[1, 5]}
                ticks={[1, 2, 3, 4, 5]}
                tick={{ fontSize: 10, fill: '#9CA3AF' }}
                tickLine={false}
                axisLine={false}
                width={40}
                tickFormatter={(v: number) => FEEL_EMOJI[v] ?? ''}
              />
              <Tooltip content={<FeelTooltip />} />
              <Line
                type="monotone"
                dataKey="feel"
                stroke="#14B8A6"
                strokeWidth={2}
                dot={<FeelDot />}
                activeDot={{ r: 6, stroke: '#0D9488', strokeWidth: 2, fill: 'white' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}

      {/* Distance progress (cumulative) */}
      {activeView === 'distance' && hasDistance && (
        <>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">
            Distance progress
          </p>
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={distanceTimeline} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="tealGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#14B8A6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 10, fill: '#9CA3AF' }}
                tickLine={false}
                axisLine={false}
                interval={Math.max(0, Math.floor(distanceTimeline.length / 6) - 1)}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#9CA3AF' }}
                tickLine={false}
                axisLine={false}
                width={40}
                unit=" km"
              />
              <Tooltip content={<DistanceTooltip />} />
              <Area
                type="monotone"
                dataKey="cumulativeKm"
                stroke="#0D9488"
                strokeWidth={2}
                fill="url(#tealGradient)"
              />
              {/* Milestone pins */}
              {distanceTimeline
                .filter(p => milestoneMap.has(p.date))
                .map(p => {
                  const pin = milestoneMap.get(p.date)!
                  return (
                    <ReferenceDot
                      key={`${p.date}-${pin.label}`}
                      x={p.dateLabel}
                      y={p.cumulativeKm}
                      r={6}
                      fill="#F59E0B"
                      stroke="white"
                      strokeWidth={2}
                      label={{
                        value: pin.icon,
                        position: 'top',
                        fontSize: 14,
                        offset: 8,
                      }}
                    />
                  )
                })}
            </AreaChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  )
}
