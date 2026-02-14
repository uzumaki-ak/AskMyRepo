import {
  BotIcon,
  CreditCardIcon,
  FileTextIcon,
  KeyIcon,
  LayoutDashboardIcon,
  PlusCircleIcon,
  PresentationIcon,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { Button } from "~/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "~/components/ui/sidebar";
import useProject from "~/hooks/use-project";
import { cn } from "~/lib/utils";
import { ApiKeySettings } from "~/components/api-key-settings";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";

const sideBarItems = [
  {
    title: "Dahsboard",
    url: "/dashboard",
    icon: LayoutDashboardIcon,
  },
  {
    title: "Q&A",
    url: "/qa",
    icon: BotIcon,
  },
  {
    title: "Mating",
    url: "/meetings",
    icon: PresentationIcon,
  },
  {
    title: "Billing",
    url: "/billing",
    icon: CreditCardIcon,
  },
];

const AppSidebar = () => {
  const pathname = usePathname();
  const { open } = useSidebar();
  const { projects, projectId, setProjectId } = useProject();
  const utils = api.useUtils();
  const { data: readmeData } = api.readme.get.useQuery(
    { projectId: projectId ?? "" },
    { enabled: !!projectId },
  );
  const hasReadme = !!readmeData?.content;
  const deleteProject = api.project.deleteProject.useMutation({
    onSuccess: async (_data, variables) => {
      toast.success("Project deleted");
      await utils.project.getProjects.invalidate();
      if (projectId === variables.projectId) {
        setProjectId("");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete project");
    },
  });
  return (
    <Sidebar collapsible="icon" variant="floating">
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <Image src="/favicon.ico" alt="logo" width={40} height={40} />
          {open && (
            <h2 className="text-primary/80 text-xl font-bold">AskRepo</h2>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sideBarItems.map((sidebaritem) => {
                return (
                  <SidebarMenuItem key={sidebaritem.title}>
                    <SidebarMenuButton asChild>
                      <Link
                        href={sidebaritem.url}
                        className={cn({
                          "!bg-primary !text-white":
                            pathname === sidebaritem.url,
                        })}
                      >
                        <sidebaritem.icon />
                        <span>{sidebaritem.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Your Projects</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {projects?.map((project) => {
                return (
                  <SidebarMenuItem key={project.name}>
                    <SidebarMenuButton asChild>
                      <div
                        onClick={() => {
                          setProjectId(project.id);
                        }}
                      >
                        <div
                          className={cn(
                            "text-primary flex size-6 items-center justify-center rounded-sm border bg-white text-sm",
                            {
                              "bg-primary text-white": project.id === projectId,
                            },
                          )}
                        >
                          {project.name[0]}
                        </div>
                        <span>{project.name}</span>
                      </div>
                    </SidebarMenuButton>
                    {open && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <SidebarMenuAction
                            showOnHover
                            onPointerDown={(event) => {
                              event.stopPropagation();
                            }}
                            onClick={(event) => {
                              event.stopPropagation();
                            }}
                          >
                            <Trash2 />
                            <span className="sr-only">
                              Delete {project.name}
                            </span>
                          </SidebarMenuAction>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete project</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove "{project.name}" from your
                              dashboard. You can’t undo this action.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              disabled={deleteProject.isPending}
                              onClick={() => {
                                deleteProject.mutate({
                                  projectId: project.id,
                                });
                              }}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    {open && project.id === projectId && hasReadme && (
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            asChild
                            isActive={pathname === "/readme"}
                          >
                            <Link href="/readme">
                              <FileTextIcon />
                              <span>README</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    )}
                  </SidebarMenuItem>
                );
              })}
              <div className="h-2"></div>
              {open && (
                <SidebarMenuItem>
                  <Link href="/create">
                    <Button size="sm" variant={"secondary"} className="w-fit">
                      <PlusCircleIcon /> Create Project
                    </Button>
                  </Link>
                </SidebarMenuItem>
              )}
              <div className="h-2"></div>
              {open && (
                <SidebarMenuItem>
                  <ApiKeySettings />
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
