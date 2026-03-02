import Image from "next/image";
import DashboardAdmin from "./pages/Dashboard_Admin/page";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <div>
        <DashboardAdmin></DashboardAdmin>
      </div>
    </div>
  );
}
