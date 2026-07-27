export interface DragItem<T = unknown> {
  id: string | number;
  index: number;
  type: string;
  data?: T;
}

export interface DropResult<T = unknown> {
  item: DragItem<T>;
  targetIndex: number;
  targetId?: string | number;
}

export interface DndProviderProps {
  children: React.ReactNode;
  backend?: "html5" | "touch";
  /** Enable touch backend on mobile, html5 on desktop */
  adaptive?: boolean;
}

export interface DraggableProps<T = unknown> {
  id: string | number;
  index: number;
  type: string;
  data?: T;
  disabled?: boolean;
  children: React.ReactNode | ((dragState: DragState) => React.ReactNode);
  className?: string;
  dragClassName?: string;
  onDragStart?: (item: DragItem<T>) => void;
  onDragEnd?: (item: DragItem<T>, didDrop: boolean) => void;
}

export interface DroppableProps<T = unknown> {
  accept: string | string[];
  children: React.ReactNode | ((dropState: DropState) => React.ReactNode);
  className?: string;
  activeClassName?: string;
  hoverClassName?: string;
  disabled?: boolean;
  onDrop?: (item: DragItem<T>) => void;
  onHover?: (item: DragItem<T>) => void;
  canDrop?: (item: DragItem<T>) => boolean;
}

export interface SortableListProps<T extends { id: string | number }> {
  items: T[];
  type?: string;
  direction?: "vertical" | "horizontal" | "grid";
  gap?: number;
  disabled?: boolean;
  className?: string;
  itemClassName?: string;
  dragItemClassName?: string;
  renderItem: (item: T, index: number, dragState: DragState) => React.ReactNode;
  onReorder: (items: T[], fromIndex: number, toIndex: number) => void;
  onDragStart?: (item: T, index: number) => void;
  onDragEnd?: (item: T, index: number) => void;
  keyExtractor?: (item: T) => string | number;
}

export interface SortableItemProps {
  id: string | number;
  index: number;
  type: string;
  disabled?: boolean;
  direction?: "vertical" | "horizontal";
  children: React.ReactNode | ((dragState: DragState) => React.ReactNode);
  className?: string;
  dragClassName?: string;
  onMove: (fromIndex: number, toIndex: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export interface DragOverlayProps {
  children?: React.ReactNode;
  className?: string;
}

export interface DragState {
  isDragging: boolean;
  canDrag: boolean;
}

export interface DropState {
  isOver: boolean;
  canDrop: boolean;
  itemType: string | symbol | null;
}
