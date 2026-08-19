const forceLight = `document.documentElement.classList.remove('dark');`;

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: forceLight }} />
      {children}
    </>
  );
}
