import Link from "next/link";

export default function NotFound() {
  return <div className="page-width py-24"><p className="font-semibold text-teal-700">404</p><h1 className="mt-4 text-4xl font-semibold tracking-tight">Page not found</h1><p className="mt-5 text-slate-600">This page is not available. Head back to the TechIdea homepage.</p><Link href="/" className="mt-8 inline-block rounded-xl bg-teal-800 px-6 py-3 font-medium text-white">Back to home</Link></div>;
}
