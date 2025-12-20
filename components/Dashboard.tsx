
import React from 'react';
import { RUST_TOPICS } from '../constants';

const Dashboard: React.FC = () => {
  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-bold text-white mb-2">Welcome Back, Rustacean</h1>
        <p className="text-[#8b949e]">Your journey to mastering Rust continues. Here's your current progress based on artifact analysis.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
          <p className="text-xs font-bold text-[#8b949e] uppercase mb-1">Knowledge Coverage</p>
          <div className="text-3xl font-bold text-white">42%</div>
          <div className="mt-4 w-full bg-[#30363d] h-2 rounded-full overflow-hidden">
            <div className="bg-[#238636] h-full w-[42%]"></div>
          </div>
          <p className="text-xs text-[#8b949e] mt-4 italic">Next target: Pattern Matching</p>
        </div>
        
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
          <p className="text-xs font-bold text-[#8b949e] uppercase mb-1">Feynman Score</p>
          <div className="text-3xl font-bold text-[#f85149]">8.4/10</div>
          <p className="text-sm text-[#c9d1d9] mt-2">Strong in Ownership, but Lifetimes need more depth.</p>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
          <p className="text-xs font-bold text-[#8b949e] uppercase mb-1">Knowledge Artifacts</p>
          <div className="text-3xl font-bold text-white">12</div>
          <p className="text-sm text-[#8b949e] mt-2">Stored locally as per Chen Ran method.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section>
          <h2 className="text-lg font-bold text-white mb-4">Mastery Roadmap</h2>
          <div className="space-y-3">
            {RUST_TOPICS.map((topic, i) => (
              <div key={topic} className="flex items-center gap-4 bg-[#161b22] border border-[#30363d] p-4 rounded-lg">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                  i < 3 ? 'bg-[#238636] border-[#238636] text-white' : i === 3 ? 'border-[#f2cc60] text-[#f2cc60]' : 'border-[#30363d] text-[#8b949e]'
                }`}>
                  {i < 3 ? '✓' : i + 1}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${i < 3 ? 'text-white' : 'text-[#8b949e]'}`}>{topic}</p>
                  <div className="h-1 bg-[#30363d] mt-2 rounded-full overflow-hidden">
                    <div className={`h-full ${i < 3 ? 'bg-[#238636] w-full' : i === 3 ? 'bg-[#f2cc60] w-[30%]' : 'w-0'}`}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-4">Recent Insights</h2>
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg divide-y divide-[#30363d]">
            {[
              "The difference between T, &T, and &mut T is finally clicking.",
              "Lifetimes are just a static analysis tool for the compiler.",
              "Need to review Arc vs Rc patterns in multithreaded contexts."
            ].map((insight, i) => (
              <div key={i} className="p-4 flex gap-4">
                <div className="w-1.5 h-1.5 bg-[#f85149] rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-[#c9d1d9] italic">"{insight}"</p>
              </div>
            ))}
          </div>
          
          <div className="mt-8 p-6 bg-[#21262d] rounded-lg border border-dashed border-[#484f58]">
            <h3 className="text-sm font-bold text-white mb-2">Chen Ran's Learning Loop</h3>
            <ol className="text-xs text-[#8b949e] space-y-2 list-decimal list-inside">
              <li>Initiate a coach session to set a target goal.</li>
              <li>Explain what you've learned in the Feynman Lab.</li>
              <li>Generate an Artifact to document insights and gaps.</li>
              <li>Review Artifacts daily to patch knowledge leaks.</li>
            </ol>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
