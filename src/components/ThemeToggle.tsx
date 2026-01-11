import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/ThemeProvider";
import { motion } from "framer-motion";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="relative overflow-hidden border-primary/20 hover:border-primary/50 hover:shadow-glow"
        >
          <motion.div
            initial={false}
            animate={{ 
              rotate: theme === "dark" ? 180 : 0,
              scale: theme === "dark" ? 0 : 1 
            }}
            transition={{ duration: 0.3 }}
            className="absolute"
          >
            <Sun className="h-[1.2rem] w-[1.2rem]" />
          </motion.div>
          <motion.div
            initial={false}
            animate={{ 
              rotate: theme === "dark" ? 0 : -180,
              scale: theme === "dark" ? 1 : 0 
            }}
            transition={{ duration: 0.3 }}
            className="absolute"
          >
            <Moon className="h-[1.2rem] w-[1.2rem]" />
          </motion.div>
          <span className="sr-only">Alternar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass">
        <DropdownMenuItem 
          onClick={() => setTheme("light")}
          className="cursor-pointer gap-2"
        >
          <Sun className="h-4 w-4" />
          Claro
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("dark")}
          className="cursor-pointer gap-2"
        >
          <Moon className="h-4 w-4" />
          Escuro
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("system")}
          className="cursor-pointer gap-2"
        >
          <Monitor className="h-4 w-4" />
          Sistema
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
