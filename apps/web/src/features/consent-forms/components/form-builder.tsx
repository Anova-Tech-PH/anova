"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  FileText,
  CheckSquare,
  Type,
  AlignLeft,
  PenTool,
  AlertTriangle,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
  Input,
  ModalOverlay,
  useConfirm,
} from "@attendly/ui/components";
import {
  createElement,
  updateElement,
  deleteElement,
  reorderElements,
} from "../actions";
import type { ConsentFormElement } from "../queries";

interface FormBuilderProps {
  eventId: string;
  formId: string;
  elements: ConsentFormElement[];
}

const elementTypeOptions: {
  value: ConsentFormElement["type"];
  label: string;
  icon: typeof FileText;
}[] = [
  { value: "description", label: "Description Text", icon: FileText },
  { value: "checkbox", label: "Checkbox", icon: CheckSquare },
  { value: "text", label: "Text Input", icon: Type },
  { value: "textarea", label: "Text Area", icon: AlignLeft },
  { value: "signature", label: "Signature", icon: PenTool },
];

const typeIcons: Record<ConsentFormElement["type"], typeof FileText> = {
  description: FileText,
  checkbox: CheckSquare,
  text: Type,
  textarea: AlignLeft,
  signature: PenTool,
};

export function FormBuilder({
  eventId,
  formId,
  elements: initialElements,
}: FormBuilderProps) {
  const router = useRouter();
  const [elements, setElements] = useState(initialElements);
  const [showModal, setShowModal] = useState(false);
  const [editingElement, setEditingElement] =
    useState<ConsentFormElement | null>(null);
  const [elementType, setElementType] =
    useState<ConsentFormElement["type"]>("checkbox");
  const [elementLabel, setElementLabel] = useState("");
  const [elementRequired, setElementRequired] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const hasSignature = elements.some((el) => el.type === "signature");

  function openAddModal() {
    setEditingElement(null);
    setElementType("checkbox");
    setElementLabel("");
    setElementRequired(true);
    setShowModal(true);
  }

  function openEditModal(element: ConsentFormElement) {
    setEditingElement(element);
    setElementType(element.type);
    setElementLabel(element.label);
    setElementRequired(element.is_required);
    setShowModal(true);
  }

  function handleSaveElement() {
    if (!elementLabel.trim()) {
      toast.error("Label is required");
      return;
    }

    startTransition(async () => {
      try {
        if (editingElement) {
          await updateElement(eventId, editingElement.id, {
            type: elementType,
            label: elementLabel.trim(),
            is_required: elementRequired,
          });
          setElements((prev) =>
            prev.map((el) =>
              el.id === editingElement.id
                ? {
                    ...el,
                    type: elementType,
                    label: elementLabel.trim(),
                    is_required: elementRequired,
                  }
                : el
            )
          );
          toast.success("Element updated");
        } else {
          const element = await createElement(eventId, formId, {
            type: elementType,
            label: elementLabel.trim(),
            is_required: elementRequired,
          });
          setElements((prev) => [...prev, element as ConsentFormElement]);
          toast.success("Element added");
        }
        setShowModal(false);
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to save element"
        );
      }
    });
  }

  async function handleDeleteElement(elementId: string) {
    const ok = await confirm({
      title: "Delete Element",
      description:
        "Delete this form element? This action cannot be undone.",
      confirmLabel: "Delete",
    });
    if (!ok) return;

    startTransition(async () => {
      try {
        await deleteElement(eventId, elementId);
        setElements((prev) => prev.filter((el) => el.id !== elementId));
        toast.success("Element deleted");
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to delete element"
        );
      }
    });
  }

  function handleMoveElement(index: number, direction: "up" | "down") {
    const newElements = [...elements];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newElements.length) return;

    [newElements[index], newElements[targetIndex]] = [
      newElements[targetIndex],
      newElements[index],
    ];
    setElements(newElements);

    startTransition(async () => {
      try {
        await reorderElements(
          eventId,
          newElements.map((el) => el.id)
        );
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to reorder elements"
        );
      }
    });
  }

  // Filter available types for add modal — only allow one signature
  const availableTypes = elementTypeOptions.filter((opt) => {
    if (opt.value === "signature" && hasSignature && !editingElement) {
      return false;
    }
    if (
      opt.value === "signature" &&
      hasSignature &&
      editingElement &&
      editingElement.type !== "signature"
    ) {
      return false;
    }
    return true;
  });

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Form Elements</h3>
          <Button size="sm" onClick={openAddModal} disabled={isPending}>
            <Plus className="mr-2 h-4 w-4" />
            Add Element
          </Button>
        </div>

        {!hasSignature && elements.length > 0 && (
          <div className="flex items-center gap-2 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <p>
              This form has no signature element. Add one so participants can
              sign the form.
            </p>
          </div>
        )}

        {elements.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No elements yet. Add elements to build your form.
          </div>
        ) : (
          <div className="space-y-2">
            {elements.map((element, index) => {
              const TypeIcon = typeIcons[element.type];
              return (
                <div
                  key={element.id}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <TypeIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{element.label}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground capitalize">
                        {element.type}
                      </span>
                      {element.is_required && (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          Required
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMoveElement(index, "up")}
                      disabled={index === 0 || isPending}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMoveElement(index, "down")}
                      disabled={index === elements.length - 1 || isPending}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(element)}
                      disabled={isPending}
                      className="h-8 w-8 p-0"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteElement(element.id)}
                      disabled={isPending}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Add / Edit Element Modal */}
      {showModal && (
        <ModalOverlay onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {editingElement ? "Edit Element" : "Add Element"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Type</label>
              <select
                value={elementType}
                onChange={(e) =>
                  setElementType(
                    e.target.value as ConsentFormElement["type"]
                  )
                }
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {availableTypes.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Label</label>
              <textarea
                value={elementLabel}
                onChange={(e) => setElementLabel(e.target.value)}
                placeholder={
                  elementType === "description"
                    ? "Enter the description text..."
                    : elementType === "signature"
                      ? "e.g. Signature"
                      : "e.g. I agree to the terms and conditions"
                }
                rows={3}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>

            {elementType !== "description" && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="element-required"
                  checked={elementRequired}
                  onChange={(e) => setElementRequired(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="element-required" className="text-sm">
                  Required
                </label>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveElement}
                disabled={isPending || !elementLabel.trim()}
              >
                {isPending
                  ? "Saving..."
                  : editingElement
                    ? "Update"
                    : "Add"}
              </Button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {confirmDialog}
    </Card>
  );
}
