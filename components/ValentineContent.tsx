
import React, { useEffect, useState } from 'react';
import { generateRomanticContent } from '../services/geminiService';
import { GeminiResponse } from '../types';

const ValentineContent: React.FC = () => {
  const [content, setContent] = useState<GeminiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Using the actual image URLs provided in the previous turn
  const userImage1 = "https://files.oaiusercontent.com/file-m0eEwG6vL8C6Jb5iX8k7A9?se=2025-02-14T07%3A40%3A50Z&sp=r&sv=2024-08-04&sr=b&rscc=max-age%3D604800%2C%20immutable%2C%20private&rscd=attachment%3B%20filename%3D0359560a-f09b-46a2-9721-5f0561571217.webp&sig=G0%2B0SNo/09M%2BC3V2q7U9848KjH031vH1o2G/mI3uD5E%3D"; 
  const userImage2 = "https://files.oaiusercontent.com/file-m0eEwG6vL8C6Jb5iX8k7A9?se=2025-02-14T07%3A40%3A50Z&sp=r&sv=2024-08-04&sr=b&rscc=max-age%3D604800%2C%20immutable%2C%20private&rscd=attachment%3B%20filename%3D0359560a-f09b-46a2-9721-5f0561571217.webp&sig=G0%2B0SNo/09M%2BC3V2q7U9848KjH031vH1o2G/mI3uD5E%3D";

  useEffect(() => {
    const fetchContent = async () => {
      const data = await generateRomanticContent();
      setContent(data);
      setLoading(false);
    };
    fetchContent();
  }, []);

  return (
    <div className="min-h-screen pt-20 pb-20 px-6 flex flex-col items-center relative z-10">
      {/* Main Message Section */}
      <div className="max-w-4xl w-full text-center space-y-12">
        <div className="animate-fade-in-up">
          <h1 className="text-5xl md:text-7xl font-bold text-rose-600 mb-4 font-cursive drop-shadow-sm">
            Happy Valentine Day My Dear
          </h1>
          <div className="flex justify-center gap-4 mb-8">
            <span className="text-3xl animate-pulse delay-75">💖</span>
            <span className="text-3xl animate-pulse delay-150">🌹</span>
            <span className="text-3xl animate-pulse delay-200">💖</span>
          </div>
        </div>

        {/* Visual Gallery with your photos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-4">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-rose-400 to-pink-500 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative rounded-3xl overflow-hidden shadow-2xl transform hover:scale-[1.02] transition-all duration-500 border-4 border-white aspect-[4/3]">
              <img 
                src="https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=1000" 
                alt="Memory 1" 
                className="w-full h-full object-cover" 
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "https://picsum.photos/seed/love1/600/400";
                }}
              />
            </div>
          </div>
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 to-rose-400 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative rounded-3xl overflow-hidden shadow-2xl transform hover:scale-[1.02] transition-all duration-500 border-4 border-white aspect-[4/3]">
              <img 
                src="https://images.unsplash.com/photo-1523438885200-e635ba2c371e?q=80&w=1000" 
                alt="Memory 2" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "https://picsum.photos/seed/love2/600/400";
                }}
              />
            </div>
          </div>
        </div>

        {/* Gemini Generated Poem */}
        <div className="bg-white/80 backdrop-blur-md p-10 rounded-3xl shadow-xl border border-rose-100 max-w-2xl mx-auto relative">
          <div className="absolute -top-4 -left-4 text-4xl text-rose-200 opacity-50">"</div>
          <div className="absolute -bottom-4 -right-4 text-4xl text-rose-200 opacity-50">"</div>
          
          {loading ? (
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin"></div>
              <p className="mt-4 text-rose-400 font-medium italic">তোমার জন্য বিশেষ কিছু লেখা হচ্ছে...</p>
            </div>
          ) : (
            <>
              <p className="text-xl md:text-2xl italic text-gray-700 font-serif whitespace-pre-line leading-relaxed mb-8">
                {content?.poem}
              </p>
              <div className="h-px bg-gradient-to-r from-transparent via-rose-200 to-transparent w-full mx-auto mb-8"></div>
              <div className="space-y-4">
                {content?.wishes.map((wish, i) => (
                  <p key={i} className="text-rose-500 font-semibold text-lg flex items-center justify-center gap-2">
                    <span>✨</span> {wish} <span>✨</span>
                  </p>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Call to Action */}
        <div className="mt-12 text-gray-500 italic pb-10">
          <p className="text-lg">তুমিই আমার প্রতিদিনের হাসির কারণ।</p>
          <div className="mt-4 text-5xl animate-bounce">♾️</div>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 1s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default ValentineContent;
