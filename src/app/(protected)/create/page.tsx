// "use client";

// import React from "react";
// import { useForm } from "react-hook-form";
// import { toast } from "sonner";
// import { Button } from "~/components/ui/button";
// import { Input } from "~/components/ui/input";
// import useRefetch from "~/hooks/use-refetch";
// import { api } from "~/trpc/react";

// type FormInput = {
//   repoUrl: string;
//   projectName: string;
//   githubToken?: string;
// };

// const Create = () => {
//   const { register, handleSubmit, reset } = useForm<FormInput>();
//   const createProject = api.project.createProject.useMutation();
//   const refetch = useRefetch()
//   function onSubmit(data: FormInput) {
//     // window.alert(JSON.stringify(data, null, 2));
//     createProject.mutate(
//       {
//         githubUrl: data.repoUrl,
//         name: data.projectName,
//         githubToken: data.githubToken,
//       },
//       {
//         onSuccess: () => {
//           toast.success("proj crerated sexsexfully🫡");
//           refetch()
//           reset();
//         },
//         onError: () => {
//           toast.error("failed u mait 😓");
//         },
//       },
//     );
//     return true;
//   }
//   return (
//     <div className="flex h-full items-center justify-center gap-12">
//       <img src="/undraw-git.svg" className="h-56 w-auto" />
//       <div>
//         <div className="">
//           <h1 className="text-2xl font-semibold"> link your git repo</h1>
//           <p className="text-muted-foreground text-sm">
//             enter url of ur git repo
//           </p>
//         </div>
//         <div className="h-4"></div>
//         <div>
//           <form onSubmit={handleSubmit(onSubmit)}>
//             <Input
//               {...register("projectName", { required: true })}
//               placeholder="Project Nqame"
//               required
//             />
//             <div className="h-2"></div>
//             <Input
//               {...register("repoUrl", { required: true })}
//               placeholder="github Url"
//               type="url"
//               required
//             />
//             <div className="h-2"></div>
//             <Input {...register("githubToken")} placeholder="Github Token" />
//             <div className="h-3"></div>
//             <Button type="submit" disabled={createProject.isPending}>
//               create Project
//             </Button>
//           </form>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Create;

"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import useRefetch from "~/hooks/use-refetch";
import { api } from "~/trpc/react";

type FormInput = {
  repoUrl: string;
  projectName: string;
  githubToken?: string;
};

const Create = () => {
  const { register, handleSubmit, reset } = useForm<FormInput>();
  const createProject = api.project.createProject.useMutation();
  const refetch = useRefetch();
  function onSubmit(data: FormInput) {
    // window.alert(JSON.stringify(data, null, 2));
    createProject.mutate(
      {
        githubUrl: data.repoUrl,
        name: data.projectName,
        githubToken: data.githubToken,
      },
      {
        onSuccess: () => {
          toast.success("proj crerated sexsexfully🫡");
          refetch();
          reset();
        },
        onError: () => {
          toast.error("failed u mait 😓");
        },
      },
    );
    return true;
  }
  return (
    <div className="flex h-full items-center justify-center gap-12">
      <img src="/undraw-git.svg" className="h-56 w-auto" />
      <div>
        <div className="">
          <h1 className="text-2xl font-semibold"> link your git repo</h1>
          <p className="text-muted-foreground text-sm">
            enter url of ur git repo
          </p>
        </div>
        <div className="h-4"></div>
        <div>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Input
              {...register("projectName", { required: true })}
              placeholder="Project Nqame"
              required
            />
            <div className="h-2"></div>
            <Input
              {...register("repoUrl", { required: true })}
              placeholder="github Url"
              type="url"
              required
            />
            <div className="h-2"></div>
            <Input {...register("githubToken")} placeholder="Github Token" />
            <div className="h-3"></div>
            <Button type="submit" disabled={createProject.isPending}>
              create Project
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Create;
