import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { User, LogOut, ChevronLeft, ChevronRight, Moon, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/stores/auth-store';
import { useTheme } from '../../context/ThemeProvider';
// import empriseLogo from '../../assets/empriseLogo.png';
import empriseLogo from '../../assets/emprise.jpeg';

export const Header = ({ collapsed, setCollapsed }: { collapsed: boolean; setCollapsed: (value: boolean) => void }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Button
          variant="outline"
          size="sm"
          className="mr-4 hover:bg-accent hover:text-accent-foreground focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </Button>
        <a href="/" className="mr-6 flex items-center space-x-2">
          <img src={empriseLogo} alt="Emprise UNIVORA Logo" className="h-8" />
        </a>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            {/* Add search functionality if needed */}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="relative rounded-full hover:bg-accent hover:text-accent-foreground focus:ring-2 focus:ring-offset-2 focus:ring-primary p-2"
            onClick={toggleTheme}
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="relative rounded-full hover:bg-accent hover:text-accent-foreground focus:ring-2 focus:ring-offset-2 focus:ring-primary p-2"
              >
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};