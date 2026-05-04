"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Copy } from "lucide-react";
import { toast } from "sonner";
import { duplicateTemplateAction } from "@/app/actions/template-actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TemplateCardMenuProps {
  templateId: string;
}

export function TemplateCardMenu({ templateId }: TemplateCardMenuProps) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const handleDuplicate = async () => {
    try {
      setIsPending(true);
      const res = await duplicateTemplateAction(templateId);
      if (res.success) {
        toast.success("Template duplicated successfully!");
        router.push(`/templates/${res.id}/builder`);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to duplicate template");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-white/50 hover:text-white hover:bg-white/10"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 bg-[#1e1e2e] border-white/10 text-white">
        <DropdownMenuItem 
          onClick={handleDuplicate}
          disabled={isPending}
          className="hover:bg-white/5 focus:bg-white/5 cursor-pointer flex items-center gap-2"
        >
          <Copy className="h-4 w-4 text-white/50" />
          <span>Duplicate</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
