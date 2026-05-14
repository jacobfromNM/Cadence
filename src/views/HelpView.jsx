// src/views/HelpView.jsx
//
// Role-aware help/docs page. Standalone — no AppShell wrapper.
// The section matching the viewer's role is expanded by default.

import React, { useState } from 'react'

const SECTIONS = [
  {
    id: 'parent',
    role: 'parent',
    emoji: '👨‍👩‍👧',
    title: 'For Parents',
    items: [
      {
        q: 'How do I log in?',
        a: "Open the link your school provided (or scan the QR code). Enter your student's parent code — a short code that looks like AB123456. You'll find it on any communication from the school.",
      },
      {
        q: 'Can I add siblings?',
        a: "Yes. After logging in, tap Add Student and enter the sibling's parent code. Both students will appear on your screen and you only need to log in once.",
      },
      {
        q: 'How does location work?',
        a: "When you tap Allow Location, Cadence watches your GPS in the background. When you're within about 400 meters of the school, staff are automatically notified that you've arrived — no tapping required.",
      },
      {
        q: "What do the pickup status labels mean?",
        a: '"Getting ready…" means staff have seen the request and your student is being prepared. "On the way out…" means the teacher has confirmed and your student is heading to you. "Picked up!" means the pickup is complete.',
      },
      {
        q: 'Can I mark my child absent?',
        a: 'Yes. Tap the Mark Absent button on your student\'s card. Staff will see the absence in their view. You can undo this any time during the same day.',
      },
    ],
  },
  {
    id: 'staff',
    role: 'staff',
    emoji: '🚗',
    title: 'For Pickup Staff',
    items: [
      {
        q: 'How do I request a pickup?',
        a: 'Go to the Students tab and search for the student by name or class. Tap their card, then tap Request Pickup. The request appears instantly in the teacher\'s queue.',
      },
      {
        q: 'What is the parent-nearby alert?',
        a: "When a parent's phone detects they're within 400 meters of the school, a yellow alert card appears at the top of the Students tab. Tap it to request the pickup directly from that alert.",
      },
      {
        q: 'How do I see active pickups?',
        a: 'Tap the Active tab. It shows all pickup requests in progress — requested, sent, and recently completed. A yellow badge on the tab counts pending requests.',
      },
      {
        q: 'Can I see which students are absent?',
        a: 'Yes. Absent students appear with a yellow tint on their card in the Students tab and are labelled "Absent today". You cannot request a pickup for an absent student.',
      },
      {
        q: 'How do I browse by class?',
        a: 'Go to the Classes tab. Tap any class to drill into the student list for that room.',
      },
    ],
  },
  {
    id: 'teacher',
    role: 'teacher',
    emoji: '🏫',
    title: 'For Teachers',
    items: [
      {
        q: 'How do I use the pickup queue?',
        a: "The Queue tab shows all pickup requests for your class in real-time. When a request comes in, the student's card appears with a 'Send' button. Tap Send to confirm the student is heading out.",
      },
      {
        q: 'What happens after I tap Send?',
        a: "The pickup status changes to 'sent' and the staff and parent can see the update instantly. The card moves to the bottom of the queue once the pickup is marked complete by staff.",
      },
      {
        q: 'Can I see students from other classes?',
        a: 'No — the queue only shows requests for your assigned class. If you need to see another class, log out and re-enter as that class\'s teacher.',
      },
    ],
  },
  {
    id: 'admin',
    role: 'admin',
    emoji: '⚙️',
    title: 'For Admins',
    items: [
      {
        q: 'How do I add classes and students?',
        a: 'Go to School Setup → Classes tab. Tap Add Class, then open the class to add students individually. Each student gets an auto-generated parent code.',
      },
      {
        q: 'Can I bulk import students?',
        a: 'Yes. Inside a class, tap Bulk Import and paste a list of student names — one per line. All students are created at once and assigned parent codes automatically.',
      },
      {
        q: 'How do I share parent codes with families?',
        a: 'Each student\'s parent code is shown on their card in the Setup view. You can also generate a school-wide QR code (Settings tab) that parents scan to reach the parent login page.',
      },
      {
        q: 'How do I change PINs?',
        a: 'Go to Setup → Settings tab. You can update the Staff PIN and Admin PIN independently. PINs are stored securely and never shown in plain text after saving.',
      },
      {
        q: 'What are active hours?',
        a: "Active hours control when parent location sharing is enabled. Outside these hours, the app won't report parent locations to staff. Set your pickup window (e.g. 2:30 PM – 4:00 PM) and the days it applies.",
      },
      {
        q: 'How does school GPS work?',
        a: "The GPS coordinates define the center of the geofence. Parents within 400 meters of these coordinates trigger a nearby alert. Tap 'Use My Location' while on-site for the most accurate reading.",
      },
      {
        q: 'How do I send an announcement?',
        a: 'Go to the Messenger view from the role screen. Type your message (max 140 characters) and tap Publish. It appears instantly in the banner on every staff, teacher, and parent screen. Tap Clear to remove it.',
      },
      {
        q: 'Where is the Daily Analytics view?',
        a: 'In School Setup, go to the Analytics tab. It shows pickup counts, average wait times, and a per-class breakdown for the current school day.',
      },
    ],
  },
]

function ChevronIcon({ open }) {
  return (
    <svg
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      style={{
        width: 18, height: 18, flexShrink: 0,
        transition: 'transform 0.2s',
        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
      }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function AccordionItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, padding: '13px 0', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left', fontFamily: 'var(--font-body)',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>{q}</span>
        <ChevronIcon open={open} />
      </button>
      {open && (
        <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, paddingBottom: 14, paddingRight: 28 }}>
          {a}
        </div>
      )}
    </div>
  )
}

function Section({ section, defaultOpen, onToggle, isOpen }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1.5px solid var(--border)',
      borderRadius: 'var(--radius)', overflow: 'hidden',
    }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '16px 18px', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left', fontFamily: 'var(--font-body)',
        }}
      >
        <span style={{ fontSize: 22, flexShrink: 0 }}>{section.emoji}</span>
        <span style={{ flex: 1, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{section.title}</span>
        <ChevronIcon open={isOpen} />
      </button>
      {isOpen && (
        <div style={{ padding: '0 18px 4px' }}>
          {section.items.map((item, i) => (
            <AccordionItem key={i} q={item.q} a={item.a} />
          ))}
        </div>
      )}
    </div>
  )
}

export function HelpView({ role, onBack }) {
  const defaultSection = SECTIONS.find(s => s.role === role)?.id ?? null
  const [openSection, setOpenSection] = useState(defaultSection)

  const toggle = (id) => setOpenSection(prev => prev === id ? null : id)

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px', background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--blue)', padding: 6, marginLeft: -6,
            display: 'flex', alignItems: 'center', flexShrink: 0,
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>Help &amp; Docs</div>
        </div>
      </div>

      {/* Content */}
      <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 640, width: '100%', alignSelf: 'center', boxSizing: 'border-box' }}>
        {/* Intro */}
        <div style={{
          background: 'var(--surface)', border: '1.5px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '16px 18px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <img src="/favicon.png" alt="Cadence" style={{ width: 28, height: 28, borderRadius: 7, objectFit: 'cover' }} />
            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Cadence</span>
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>
            Cadence is a real-time school pickup coordinator. It replaces walkie-talkies with a shared
            live view — staff request pickups, teachers confirm send-outs, and parents get instant status
            updates right on their phone.
          </p>
        </div>

        {/* Role sections */}
        {SECTIONS.map(section => (
          <Section
            key={section.id}
            section={section}
            isOpen={openSection === section.id}
            onToggle={() => toggle(section.id)}
          />
        ))}

        <div style={{ height: 24 }} />
      </div>
    </div>
  )
}
