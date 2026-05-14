"use client";

type Props = {
  value: string;
  onChange: (next: string) => void;
};

const fileToDataURL = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

export default function ImagePicker({ value, onChange }: Props) {
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const url = await fileToDataURL(file);
    onChange(url);
  };

  return (
    <div className="img-picker">
      <div className="preview">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" />
        ) : (
          <span>NO IMAGE</span>
        )}
      </div>
      <div className="pcol">
        <input
          type="url"
          placeholder="이미지 URL (https://...)"
          value={value.startsWith("data:") ? "" : value}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className="row">
          <label className="btn btn-ghost" style={{ cursor: "pointer" }}>
            파일 업로드
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </label>
          {value && (
            <button
              type="button"
              className="btn btn-ghost btn-danger"
              onClick={() => onChange("")}
            >
              제거
            </button>
          )}
        </div>
        <div className="hint">비워두면 도식형 일러스트가 자동 생성됩니다.</div>
      </div>
    </div>
  );
}
