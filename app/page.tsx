import Image from "next/image";
import DashboardAdmin from "./pages/Dashboard_Admin/page";
import LearningCenter from "./pages/Learning_Module/page"

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <div>
        <LearningCenter></LearningCenter>
        <DashboardAdmin></DashboardAdmin>
      </div>
    </div>
  );
}
