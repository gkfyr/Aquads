import { Link, useNavigate } from "react-router-dom";
import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { useEffect, useRef, useState } from "react";

export default function NavBar() {
  const navigate = useNavigate();
  const account = useCurrentAccount();
  const addr = account?.address || "";
  const myPageHref = addr ? `/wallet/${addr.toLowerCase()}` : "/wallet";
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  return (
    <div className="sticky top-0 z-50 bg-transparent">
      <div className="mx-auto max-w-7xl px-6 pt-4">
        <nav className="surface px-4 py-2">
          <div className="flex items-center gap-3 w-full">
            {/* Left: Logo */}
            <Link to="/" className="flex items-center gap-2">
              <img src="/aquads_logo.png" alt="Aquads" className="h-7 w-7 rounded object-contain" />
              <span className="text-base font-semibold text-white">Aquads</span>
            </Link>

            {/* Right: Only dropdown + wallet */}
            <div className="ml-auto flex items-center gap-2">
              <div className="relative" ref={menuRef}>
                <button className="btn-outline h-12 px-4" onClick={() => setOpen((v) => !v)}>
                  Navigate ▾
                </button>
                {open && (
                  <div className="absolute right-0 mt-2 w-48 bg-dark-700 border border-white/10 rounded-xl p-2 z-50 grid gap-1">
                    <button
                      className="btn-outline !bg-transparent hover:!bg-white/10 w-full justify-start"
                      onClick={() => {
                        setOpen(false);
                        navigate("/landing");
                      }}
                    >
                      Landing
                    </button>
                    <button
                      className="btn-outline !bg-transparent hover:!bg-white/10 w-full justify-start"
                      onClick={() => {
                        setOpen(false);
                        navigate("/");
                      }}
                    >
                      Marketplace
                    </button>
                    <button
                      className="btn-outline !bg-transparent hover:!bg-white/10 w-full justify-start"
                      onClick={() => {
                        setOpen(false);
                        navigate("/admin");
                      }}
                    >
                      Admin
                    </button>
                    <button
                      className="btn-outline !bg-transparent hover:!bg-white/10 w-full justify-start"
                      onClick={() => {
                        setOpen(false);
                        navigate(myPageHref);
                      }}
                    >
                      My Page
                    </button>
                  </div>
                )}
              </div>
              <div className="">
                <ConnectButton className="btn-outline h-9" />
              </div>
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}
