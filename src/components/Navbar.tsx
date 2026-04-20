import Link from "next/link";
import { auth } from "@/auth";
import SignOutButton from "@/components/SignOutButton";

export default async function Navbar() {
  const session = await auth();
  const isAdmin = session?.user?.role === "admin";

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
          <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
            대시보드
          </Link>
          {isAdmin ? (
            <Link
              href="/products/new"
              className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700"
            >
              + 신규 등록
            </Link>
          ) : null}
          <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{session?.user?.name}</p>
              <p className="text-xs text-gray-500">{session?.user?.role}</p>
            </div>
            <SignOutButton />
          </div>
        </div>
      </div>
    </nav>
  );
}
