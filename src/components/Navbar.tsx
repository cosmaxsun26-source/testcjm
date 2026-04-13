import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-gray-900">
          OTC Development Tracker
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
            제품 목록
          </Link>
          <Link
            href="/products/new"
            className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700"
          >
            + 신규 등록
          </Link>
        </div>
      </div>
    </nav>
  );
}
