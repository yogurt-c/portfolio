"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Project } from "@/types";
import Toast from "./Toast";

export default function AdminList({ initial }: { initial: Project[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [toast, setToast] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDelete = async (id: string) => {
    if (!confirm("이 프로젝트를 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setToast("삭제 실패");
      return;
    }
    setItems((xs) => xs.filter((x) => x.id !== id));
    setToast("삭제되었습니다.");
    router.refresh();
  };

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.id === active.id);
    const to = items.findIndex((i) => i.id === over.id);
    if (from < 0 || to < 0) return;

    const next = arrayMove(items, from, to);
    setItems(next); // 낙관 업데이트
    const res = await fetch("/api/projects/order", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ order: next.map((p) => p.id) }),
    });
    if (!res.ok) {
      setItems(items); // 롤백
      setToast("순서 변경 실패");
      return;
    }
    setToast("순서가 저장되었습니다.");
    router.refresh();
  };

  if (items.length === 0) {
    return (
      <div className="a-list">
        <div className="a-empty">
          아직 프로젝트가 없습니다. 우측 상단에서 추가하세요.
        </div>
        {toast && <Toast message={toast} onDone={() => setToast("")} />}
      </div>
    );
  }

  return (
    <div className="a-list">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((p) => (
            <SortableRow key={p.id} project={p} onDelete={onDelete} />
          ))}
        </SortableContext>
      </DndContext>
      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </div>
  );
}

function SortableRow({
  project,
  onDelete,
}: {
  project: Project;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: project.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`row-item ${isDragging ? "dragging" : ""}`}
    >
      <div className="grip" title="드래그해서 순서 변경" {...attributes} {...listeners}>
        ≡
      </div>
      <div className="thumb-sm">
        {project.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.image} alt="" />
        ) : (
          <span>{project.year}</span>
        )}
      </div>
      <div className="info">
        <h3 className="t">{project.title}</h3>
        <p className="d">
          <span className="y">{project.year}</span>
          {project.desc}
        </p>
      </div>
      <div className="row-actions">
        <Link className="btn btn-ghost" href={`/admin/projects/${project.id}`}>
          편집
        </Link>
        <button
          className="btn btn-ghost btn-danger"
          onClick={() => onDelete(project.id)}
        >
          삭제
        </button>
      </div>
    </div>
  );
}
