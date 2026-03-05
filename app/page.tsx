'use client';

import Image from "next/image";
import DashboardAdmin from "./pages/Dashboard_Admin/page";
import LearningCenter from "./pages/Learning_Module/page"
import { useEffect, useState } from "react"
import { getUsers } from "./Services/api";
import FileUpload from "./pages/Learning_Module/FileUpload";


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


/*
export default function Page() {
  const [users, setUsers] = useState<any[]>([])

  useEffect(() => {
    getUsers().then(data => {
      setUsers(data)
    })
  }, [])

  return (
    <div>
      <h1>Users</h1>

      {users.map(user => (
        <div key={user.id}>
          {user.name}
        </div>
      ))}

      <div>
        <h1>Users</h1>
        {users.map(user => (
          <div key={user.id}>{user.name}</div>
        ))}

          {/* Add this temporarily to test */ /*
          <FileUpload />
      </div>


    </div>

    
  )
}
*/