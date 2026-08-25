import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BookOpen, Map } from "lucide-react";
import { Button } from "@packages/ui";
import { BuilderScaffold } from "@/components/builder/BuilderScaffold";
import {
  BuilderWorkspace,
  EditorPlaceholder,
  SidebarHeader,
  SidebarItem,
} from "@/components/builder/BuilderWorkspace";
import { getProjectBuilder } from "@/lib/builders";

interface StoryScene {
  id: string;
  title: string;
}

/**
 * Story Map builder — narrative journeys that walk through your maps.
 *
 * Initial structure: a scene list on the left (add / select / remove) and an
 * editor canvas on the right. The canvas currently shows a placeholder —
 * swap it for the real scene editor (embedded map views + text + media) when
 * the builder is developed further.
 */
export default function StoryMapBuilderPage() {
  const [params] = useSearchParams();
  const projectId = params.get("projectId") ?? "";
  const builder = getProjectBuilder("story-map");

  const [scenes, setScenes] = useState<StoryScene[]>([
    { id: "scene-1", title: "Welcome" },
  ]);
  const [activeId, setActiveId] = useState("scene-1");

  if (!builder) return null;

  const activeScene = scenes.find((s) => s.id === activeId) ?? scenes[0];

  function addScene() {
    const id = `scene-${Date.now()}`;
    setScenes((prev) => [...prev, { id, title: `Scene ${prev.length + 1}` }]);
    setActiveId(id);
  }

  function removeScene(id: string) {
    if (scenes.length <= 1) return;
    const remaining = scenes.filter((s) => s.id !== id);
    setScenes(remaining);
    if (activeId === id) setActiveId(remaining[0]?.id ?? "");
  }

  return (
    <BuilderScaffold builder={builder} projectId={projectId}>
      <BuilderWorkspace
        sidebar={
          <>
            <SidebarHeader
              icon={BookOpen}
              title="Scenes"
              addLabel="Add"
              onAdd={addScene}
            />
            <div className="flex flex-col gap-0.5">
              {scenes.map((scene) => (
                <SidebarItem
                  key={scene.id}
                  icon={Map}
                  title={scene.title}
                  subtitle="Empty scene"
                  active={scene.id === activeId}
                  onClick={() => setActiveId(scene.id)}
                  onDelete={
                    scenes.length > 1 ? () => removeScene(scene.id) : undefined
                  }
                />
              ))}
            </div>
          </>
        }
        main={
          <EditorPlaceholder
            icon={BookOpen}
            title={activeScene?.title ?? "Story Map"}
            description={
              activeScene
                ? "This is where scene content will be edited — embed map views, add text blocks, images and media, then connect scenes into a guided narrative."
                : "Add a scene to start building your story map."
            }
            actions={
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <Button size="sm" onClick={addScene}>
                  Add scene
                </Button>
                <Button size="sm" variant="ghost" disabled>
                  Preview story
                </Button>
              </div>
            }
          />
        }
      />
    </BuilderScaffold>
  );
}