'use client';

import { useState } from "react";
import { uploadFile } from "../../Services/api";

export default function FileUpload() {
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setUrl(null);

    try {
      const data = await uploadFile(file);
      setUrl(data.url);
    } catch (err) {
      setError("Upload failed. Please try again.");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleChange} disabled={uploading} />
      {uploading && <p>Uploading...</p>}
      {url && <a href={url} target="_blank" rel="noopener noreferrer">View uploaded file</a>}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
