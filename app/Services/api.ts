const BASE = "http://localhost/api";

// ── Get all users from Laravel ────────────────────────────
export async function getUsers() {
  const res = await fetch(`${BASE}/users`);
  return res.json();
}

// ── Upload a file to Laravel ──────────────────────────────
export async function uploadFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE}/upload`, {
    method: "POST",
    body: formData,
    // NOTE: Do NOT manually set Content-Type here.
    // The browser sets it automatically with the correct boundary.
  });

  if (!res.ok) throw new Error("Upload failed");
  return res.json(); // returns { url, path }
}
