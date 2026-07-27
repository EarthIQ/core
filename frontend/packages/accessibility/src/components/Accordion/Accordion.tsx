import React, { useState, useCallback, ReactElement, Children, cloneElement, isValidElement } from 'react';
import type { AccordionItemProps } from './AccordionItem';

interface AccordionProps {
  children: React.ReactNode;
  allowMultiple?: boolean;
  defaultOpen?: string[];
  className?: string;
}

export const Accordion: React.FC<AccordionProps> = ({
  children,
  allowMultiple = false,
  defaultOpen = [],
  className = '',
}) => {
  const [openItems, setOpenItems] = useState<Set<string>>(() => new Set(defaultOpen));

  const toggleItem = useCallback((id: string) => {
    setOpenItems(prev => {
      const newSet = new Set(prev);
      
      if (newSet.has(id)) {
        // Close the item
        newSet.delete(id);
      } else {
        // Open the item
        if (allowMultiple) {
          newSet.add(id);
        } else {
          // Close all others and open this one
          newSet.clear();
          newSet.add(id);
        }
      }
      
      return newSet;
    });
  }, [allowMultiple]);

  return (
    <div className={`space-y-2 ${className}`}>
      {Children.map(children, (child) => {
        if (!isValidElement(child)) return null;
        
        // Get the id from props
        const itemId = (child.props as AccordionItemProps).id;
        if (!itemId) return child;
        
        const isOpen = openItems.has(itemId);
        
        return cloneElement(child as ReactElement<AccordionItemProps>, {
          isOpen,
          onToggle: () => toggleItem(itemId),
        });
      })}
    </div>
  );
};