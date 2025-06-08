import React, { useEffect, useState } from 'react';

const backendUrl = process.env.REACT_APP_BACKEND_URL;

function oodColor(score: number, min: number, max: number) {
  const norm = 1 - Math.max(0, Math.min(1, (score - min) / (max - min)));
  const r = Math.round(255 * (1 - norm));
  const g = Math.round(180 * norm + 75 * (1 - norm));
  return `rgba(${r},${g},120,0.15)`;
}

const Search: React.FC = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageMatches, setImageMatches] = useState<any[]>([]);
  const [textQuery, setTextQuery] = useState('');
  const [textMatches, setTextMatches] = useState<any[]>([]);
  const [imageOod, setImageOod] = useState<number | null>(null);
  const [textOod, setTextOod] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageBlobs, setImageBlobs] = useState<Record<string, string>>({});

  const OOD_MIN = 0;
  const OOD_MAX = 20;

  const loadImageBlobs = async (matches: any[]) => {
    const newBlobs: Record<string, string> = {};
    await Promise.all(
      matches.map(async (match) => {
        try {
          const res = await fetch(`${backendUrl}${match.path}`, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
          });
          const blob = await res.blob();
          newBlobs[match.path] = URL.createObjectURL(blob);
        } catch (err) {
          console.warn("Failed to load image:", match.path);
        }
      })
    );
    setImageBlobs((prev) => ({ ...prev, ...newBlobs }));
  };

  const handleImageUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      const res = await fetch(`${backendUrl}/search_by_image`, {
        method: 'POST',
        body: formData,
        headers: { 'ngrok-skip-browser-warning': 'true' },
        mode: "cors"
      });
      const data = await res.json();
      setImageMatches(data.results || []);
      setImageOod(data.query_ood_score ?? null);
      await loadImageBlobs(data.results || []);
    } catch (err) {
      alert('Image search failed.');
    }
    setLoading(false);
  };

  const handleTextSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/search_by_text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ query: textQuery }),
        mode: "cors"
      });
      const data = await res.json();
      setTextMatches(data.results || []);
      setTextOod(data.query_ood_score ?? null);
      await loadImageBlobs(data.results || []);
    } catch (err) {
      alert('Text search failed.');
    }
    setLoading(false);
  };

  const renderMatches = (matches: any[]) => (
    matches.map((match, idx) => (
      <div key={idx} className="result" style={{
        border: '1px solid #ccc',
        borderRadius: '8px',
        marginBottom: '1em',
        padding: '1em'
      }}>
        {imageBlobs[match.path] && (
          <img
            src={imageBlobs[match.path]}
            alt={match.caption}
            style={{ maxWidth: 400, maxHeight: 400, borderRadius: 12, marginBottom: '0.5em' }}
          />
        )}
        <div>Rank: {match.rank}</div>
        <div>Caption: {match.caption}</div>
        <div><strong>OOD Score:</strong> {match.ood_score.toFixed(2)}</div>
      </div>
    ))
  );

  return (
    <div>
      <div className="sensei-card">
        <h2>Search by Image</h2>
        <form onSubmit={handleImageUpload}>
          <input
            type="file"
            accept="image/*"
            onChange={e => setImageFile(e.target.files?.[0] || null)}
          />
          <button className="sensei-btn" type="submit" disabled={loading}>Upload & Search</button>
        </form>
        {imageOod !== null && (
          <div style={{ margin: '1em 0' }}>
            <strong>Query OOD Score:</strong> {imageOod.toFixed(2)}
          </div>
        )}
        {renderMatches(imageMatches)}
      </div>

      <div className="sensei-card">
        <h2>Search by Text</h2>
        <form onSubmit={handleTextSearch}>
          <input
            type="text"
            value={textQuery}
            onChange={e => setTextQuery(e.target.value)}
            placeholder="Enter your query..."
          />
          <button className="sensei-btn" type="submit" disabled={loading}>Search</button>
        </form>
        {textOod !== null && (
          <div style={{ margin: '1em 0' }}>
            <strong>Query OOD Score:</strong> {textOod.toFixed(2)}
          </div>
        )}
        {renderMatches(textMatches)}
      </div>
    </div>
  );
};

export default Search;