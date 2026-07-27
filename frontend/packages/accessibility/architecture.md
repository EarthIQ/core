packages/
└── accessibility/
    ├── package.json
    ├── tsconfig.json
    ├── src/
    │   ├── index.ts
    │   ├── types/
    │   │   └── index.ts
    │   ├── constants/
    │   │   ├── index.ts
    │   │   ├── defaults.ts
    │   │   ├── profiles.ts
    │   │   └── translations/
    │   │       ├── index.ts
    │   │       ├── en.ts
    │   │       ├── es.ts
    │   │       ├── fr.ts
    │   │       ├── de.ts
    │   │       ├── ar.ts
    │   │       ├── hi.ts
    │   │       ├── zh.ts
    │   │       ├── ja.ts
    │   │       └── pt.ts
    │   ├── context/
    │   │   └── AccessibilityContext.tsx
    │   ├── hooks/
    │   │   ├── index.ts
    │   │   ├── useAccessibility.ts
    │   │   ├── useAccessibilitySettings.ts
    │   │   ├── useLocale.ts
    │   │   └── useClickOutside.ts
    │   ├── components/
    │   │   ├── index.ts
    │   │   ├── AccessibilityProvider.tsx
    │   │   ├── AccessibilityWidget.tsx
    │   │   ├── TriggerButton.tsx
    │   │   ├── Panel/
    │   │   │   ├── index.ts
    │   │   │   ├── Panel.tsx
    │   │   │   ├── PanelHeader.tsx
    │   │   │   └── PanelFooter.tsx
    │   │   ├── Accordion/
    │   │   │   ├── index.ts
    │   │   │   ├── Accordion.tsx
    │   │   │   └── AccordionItem.tsx
    │   │   ├── Profiles/
    │   │   │   ├── index.ts
    │   │   │   ├── ProfilesSection.tsx
    │   │   │   └── ProfileCard.tsx
    │   │   ├── Settings/
    │   │   │   ├── index.ts
    │   │   │   ├── SettingsSection.tsx
    │   │   │   ├── MultiLevelCard.tsx
    │   │   │   └── ToggleCard.tsx
    │   │   ├── ReadingAids/
    │   │   │   ├── index.ts
    │   │   │   ├── ReadingGuide.tsx
    │   │   │   └── ReadingMask.tsx
    │   │   └── Icons/
    │   │       └── index.tsx
    │   ├── utils/
    │   │   ├── index.ts
    │   │   ├── storage.ts
    │   │   └── applySettings.ts
    │   └── styles/
    │       └── accessibility.css
    └── README.md