import type { Meta, StoryObj } from "@storybook/react-vite";
import React, { useState } from "react";
import { DndProvider } from "./DndProvider";
import { Draggable } from "./Draggable";
import { Droppable } from "./Droppable";
import { SortableList } from "./SortableList";
import { DragOverlay } from "./DragOverlay";
import { useDragAndDrop } from "./useDragAndDrop";

const meta: Meta = {
  title: "Interaction/DragAndDrop",
  decorators: [
    (Story) => (
      <DndProvider adaptive>
        <Story />
      </DndProvider>
    ),
  ],
};
export default meta;

// ─── Sortable List ─────────────────────────────────

interface Task {
  id: string;
  title: string;
  priority: "low" | "medium" | "high";
}

const initialTasks: Task[] = [
  { id: "1", title: "Design homepage", priority: "high" },
  { id: "2", title: "Write API docs", priority: "medium" },
  { id: "3", title: "Fix login bug", priority: "high" },
  { id: "4", title: "Update dependencies", priority: "low" },
  { id: "5", title: "Add dark mode", priority: "medium" },
];

const priorityColors = {
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  medium:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export const Sortable: StoryObj = {
  render: () => {
    const { items, handleReorder } = useDragAndDrop({
      initialItems: initialTasks,
    });

    return (
      <div className="mx-auto max-w-md">
        <h3 className="mb-4 text-lg font-semibold">Task Priority</h3>
        <SortableList
          items={items}
          onReorder={handleReorder}
          gap={8}
          renderItem={(task, _index, { isDragging }) => (
            <div
              className={`flex items-center justify-between rounded-lg border bg-white p-3 shadow-sm dark:bg-gray-800 ${
                isDragging ? "shadow-lg ring-2 ring-blue-400" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="cursor-grab text-gray-400">⠿</span>
                <span>{task.title}</span>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityColors[task.priority]}`}
              >
                {task.priority}
              </span>
            </div>
          )}
        />
      </div>
    );
  },
};

// ─── Drag Between Zones ────────────────────────────

interface CardItem {
  id: string;
  label: string;
}

export const DragBetweenZones: StoryObj = {
  render: () => {
    const [zone1, setZone1] = useState<CardItem[]>([
      { id: "a", label: "Item A" },
      { id: "b", label: "Item B" },
      { id: "c", label: "Item C" },
    ]);
    const [zone2, setZone2] = useState<CardItem[]>([]);

    return (
      <div className="grid grid-cols-2 gap-8">
        <div>
          <h4 className="mb-2 font-medium">Source</h4>
          <Droppable
            accept="CARD"
            onDrop={(item) => {
              const card = zone2.find((c) => c.id === String(item.id));
              if (card) {
                setZone2((p) => p.filter((c) => c.id !== card.id));
                setZone1((p) => [...p, card]);
              }
            }}
          >
            {zone1.map((card, i) => (
              <Draggable
                key={card.id}
                id={card.id}
                index={i}
                type="CARD"
              >
                <div className="mb-2 rounded bg-blue-100 p-3 dark:bg-blue-900">
                  {card.label}
                </div>
              </Draggable>
            ))}
            {zone1.length === 0 && (
              <p className="text-center text-sm text-gray-400">Drop here</p>
            )}
          </Droppable>
        </div>

        <div>
          <h4 className="mb-2 font-medium">Target</h4>
          <Droppable
            accept="CARD"
            onDrop={(item) => {
              const card = zone1.find((c) => c.id === String(item.id));
              if (card) {
                setZone1((p) => p.filter((c) => c.id !== card.id));
                setZone2((p) => [...p, card]);
              }
            }}
          >
            {zone2.map((card, i) => (
              <Draggable
                key={card.id}
                id={card.id}
                index={i}
                type="CARD"
              >
                <div className="mb-2 rounded bg-purple-100 p-3 dark:bg-purple-900">
                  {card.label}
                </div>
              </Draggable>
            ))}
            {zone2.length === 0 && (
              <p className="text-center text-sm text-gray-400">Drop here</p>
            )}
          </Droppable>
        </div>
      </div>
    );
  },
};

// ─── Kanban Board ──────────────────────────────────

export const KanbanBoard: StoryObj = {
  render: () => {
    const [columns, setColumns] = useState({
      todo: [
        { id: "k1", label: "Research competitors" },
        { id: "k2", label: "Create wireframes" },
      ],
      progress: [{ id: "k3", label: "Build components" }],
      done: [{ id: "k4", label: "Setup project" }],
    });

    const moveCard = (
      cardId: string,
      from: keyof typeof columns,
      to: keyof typeof columns
    ) => {
      const card = columns[from].find((c) => c.id === cardId);
      if (!card) return;
      setColumns((prev) => ({
        ...prev,
        [from]: prev[from].filter((c) => c.id !== cardId),
        [to]: [...prev[to], card],
      }));
    };

    const columnConfig = [
      { key: "todo" as const, title: "To Do", color: "border-gray-300" },
      {
        key: "progress" as const,
        title: "In Progress",
        color: "border-blue-400",
      },
      { key: "done" as const, title: "Done", color: "border-green-400" },
    ];

    return (
      <div className="grid grid-cols-3 gap-4">
        {columnConfig.map((col) => (
          <div key={col.key}>
            <h4 className={`mb-2 border-b-2 pb-1 font-semibold ${col.color}`}>
              {col.title} ({columns[col.key].length})
            </h4>
            <Droppable
              accept="KANBAN"
              className="min-h-[200px]"
              onDrop={(item) => {
                const from = Object.keys(columns).find((k) =>
                  columns[k as keyof typeof columns].some(
                    (c) => c.id === String(item.id)
                  )
                ) as keyof typeof columns | undefined;
                if (from && from !== col.key) {
                  moveCard(String(item.id), from, col.key);
                }
              }}
            >
              {columns[col.key].map((card, i) => (
                <Draggable
                  key={card.id}
                  id={card.id}
                  index={i}
                  type="KANBAN"
                >
                  {({ isDragging }) => (
                    <div
                      className={`mb-2 rounded-lg border bg-white p-3 shadow-sm dark:bg-gray-800 ${
                        isDragging ? "rotate-2 shadow-lg" : ""
                      }`}
                    >
                      {card.label}
                    </div>
                  )}
                </Draggable>
              ))}
            </Droppable>
          </div>
        ))}
        <DragOverlay />
      </div>
    );
  },
};
