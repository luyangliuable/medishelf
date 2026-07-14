import Image from 'next/image'

export default function Logo({ large = false }: { large?: boolean }) {
  return (
    <Image
      src="/images/medishelf.png"
      alt="MediShelf"
      width={large ? 220 : 112}
      height={large ? 113 : 58}
      priority={large}
      className="object-contain"
    />
  )
}
