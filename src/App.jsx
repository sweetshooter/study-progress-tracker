
import { db } from "./firebaseConfig";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";


import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell} from 'recharts';
import { BookOpen, Play, LogIn, LogOut, TrendingUp, Clock, AlertTriangle } from 'lucide-react';

const StudyProgressTracker = () => {
  const [students, setStudents] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [nickname, setNickname] = useState('');

  // 預設科目和影片數量
  const subjects = useMemo(() => [
    { id: 'OS', name: 'OS', totalVideos: 58 },
    { id: '計組', name: '計組', totalVideos: 69 },
    { id: '資結', name: '資結', totalVideos: 67 },
    { id: '演算法', name: '演算法', totalVideos: 16 },
    { id: '線代', name: '線代', totalVideos: 42 },
    { id: '離散', name: '離散', totalVideos: 42 }
  ],[]);

   
    const fetchStudents = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "students"));
      const studentsData = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        const progress = data.progress ||
          subjects.reduce((acc, subj) => {
            acc[subj.id] = 0;
            return acc;
          }, {});
        return {
          name: data.name,
          progress,
          lastUpdated: data.lastUpdated || "",
        };
      });
      setStudents(studentsData);
    } catch (err) {
      console.error("讀取 students 失敗", err);
      alert("讀取資料失敗，請稍後再試");
    }
  }, [subjects]);

  // useEffect 只需依賴 fetchStudents
  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // 暱稱登入功能
  const nicknameLogin = async() => {
    // window.alert("⚡ nicknameLogin 被呼叫了");
    console.log("nicknameLogin() 被呼叫了");


    if (!nickname.trim()) return;
    
    const trimmedNickname = nickname.trim();
    
    // 檢查是否已經有該暱稱的用戶
    const existingStudent = students.find(s => s.name === trimmedNickname);
    
    if (existingStudent) {
      // 如果用戶已存在，直接登入
      setCurrentUser({ nickname: trimmedNickname });
    } else {
      // 如果是新用戶，創建新的學習記錄
      const newStudent = initializeStudentProgress(trimmedNickname);

      // 新增這行：寫入 Firebase
      await setDoc(doc(db, 'students', trimmedNickname), newStudent);
      console.log("✅ Firestore 寫入成功：", newStudent);

      setStudents([...students, newStudent]);
      setCurrentUser({ nickname: trimmedNickname });
    }
    
    setNickname('');
  };

  // 登出功能
  const logout = () => {
    setCurrentUser(null);
    setNickname('');
  };

  // 初始化學生數據
  const initializeStudentProgress = (name) => {
    const progress = {};
    subjects.forEach(subject => {
      progress[subject.id] = 0;
    });
    return { 
      name, 
      progress, 
      lastUpdated: new Date().toLocaleString('zh-TW', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
  };

  // 刪除自己的帳戶
  const deleteMyAccount = async () => {
    if (!currentUser) return;

    // 1) Firestore 刪除文件
    try {
      const studentRef = doc(db, "students", currentUser.nickname);
      await deleteDoc(studentRef);
      console.log("Firestore 刪除成功", studentRef.path);
    } catch (err) {
      console.error("Firestore 刪除失敗", err);
      alert(`刪除失敗：${err.code}`);
      return; // 刪除失敗就中斷，不清 local state
    }

    // 2) 本地 state 清掉
    setStudents(students.filter(s => s.name !== currentUser.nickname));
    setCurrentUser(null);
  };

  // 更新進度（只能更新自己的）
  const updateProgress = async (subjectId, newProgress) => {
    if (!currentUser) return;
    
    const subject = subjects.find(s => s.id === subjectId);
    const clampedProgress = Math.max(0, Math.min(subject.totalVideos, newProgress));
    
    setStudents(students.map(student => 
      student.name === currentUser.nickname 
        ? { 
            ...student, 
            progress: { ...student.progress, [subjectId]: clampedProgress },
            lastUpdated: new Date().toLocaleString('zh-TW', { 
              year: 'numeric', 
              month: '2-digit', 
              day: '2-digit', 
              hour: '2-digit', 
              minute: '2-digit' 
            })
          }
        : student
    ));

      try {
        const studentRef = doc(db, 'students', currentUser.nickname);
        await updateDoc(studentRef, {
          [`progress.${subjectId}`]: clampedProgress,
          lastUpdated: new Date().toLocaleString('zh-TW', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
          })
        });
        console.log('✅ Firestore 更新成功', subjectId, clampedProgress);
      } catch (err) {
        console.error('❌ Firestore 更新失敗', err);
        alert(`更新失敗：${err.code}`);
      }
  };

  // 準備圖表數據
  const getChartData = () => {
  return subjects.map(subject => {
    const data = {
      subject: subject.name,
      total: subject.totalVideos
    };
    students.forEach(student => {
      data[student.name] = student.progress?.[subject.id] ?? 0;
    });
    return data;
  });
};

  // 計算總體進度
  const getTotalProgress = (student) => {
    const totalVideos = subjects.reduce((sum, s) => sum + s.totalVideos, 0);
    const watched = subjects.reduce(
      (sum, s) => sum + (student.progress?.[s.id] ?? 0),
      0
    );
    return totalVideos > 0
      ? Math.round((watched / totalVideos) * 100)
      : 0;
  };

  // 獲取當前用戶的進度數據
  const getCurrentUserProgress = () => {
    if (!currentUser) return null;
    return students.find(s => s.name === currentUser.nickname);
  };

  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];

  // 未登入狀態
  if (!currentUser) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md w-full">
          <BookOpen className="mx-auto text-blue-600 mb-4" size={64} />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">學習進度追蹤系統</h1>
          <p className="text-gray-600 mb-6">請輸入你的暱稱來追蹤學習進度</p>
          
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="輸入你的暱稱（例如：小明、Amy）"
            className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 text-center"
            onKeyPress={(e) => e.key === 'Enter' && nicknameLogin()}
            maxLength={20}
          />
          
          <button
            onClick={nicknameLogin}
            disabled={!nickname.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <LogIn size={20} />
            開始使用
          </button>
          
          {students.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">現有用戶：</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {students.map((student, index) => (
                  <span 
                    key={student.name}
                    className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs cursor-pointer hover:bg-blue-200 transition-colors"
                    onClick={() => {
                      setNickname(student.name);
                    }}
                  >
                    {student.name}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">點擊暱稱快速填入</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const currentUserProgress = getCurrentUserProgress();

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* 頂部用戶資訊 */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: colors[students.findIndex(s => s.name === currentUser.nickname) % colors.length] || '#8884d8' }}
            >
              {currentUser.nickname.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <BookOpen className="text-blue-600" />
                歡迎回來，{currentUser.nickname}！
              </h1>
              <p className="text-gray-600">
                {currentUserProgress ? '繼續你的學習進度' : '開始記錄你的學習進度'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={deleteMyAccount}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2"
            >
              <AlertTriangle size={16} />
              刪除我的帳戶
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-2"
            >
              <LogOut size={16} />
              登出
            </button>
          </div>
        </div>
      </div>

      {currentUserProgress && (
        <>
          {/* 我的進度更新區 */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Play className="text-purple-600" />
              更新我的進度
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjects.map(subject => (
                <div key={subject.id} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-800 mb-3">{subject.name}</h3>
                  <p className="text-sm text-gray-500 mb-3">總共 {subject.totalVideos} 部影片</p>
                  <div className="mb-2">
                    <label className="block text-sm font-medium mb-1 text-blue-600">
                      我的進度
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max={subject.totalVideos}
                        value={currentUserProgress.progress[subject.id]}
                        onChange={(e) => updateProgress(subject.id, parseInt(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-500">
                        / {subject.totalVideos} ({Math.round((currentUserProgress.progress[subject.id] / subject.totalVideos) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className="h-2 rounded-full transition-all duration-300 bg-blue-600"
                        style={{
                          width: `${(currentUserProgress.progress[subject.id] / subject.totalVideos) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {currentUserProgress.lastUpdated && (
              <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                <Clock size={16} />
                最後更新時間：{currentUserProgress.lastUpdated}
              </div>
            )}
          </div>
        </>
      )}

      {students.length > 0 && (
        <>
          {/* 圖表區域 */}
          <div className="grid grid-cols-1 gap-6 mb-6">
            {/* 長條圖 */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="text-blue-600" />
                各科目進度比較
              </h2>
              <div className="overflow-x-auto">
                <BarChart width={800} height={300} data={getChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="subject" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {students.map((student, index) => (
                    <Bar
                      key={student.name}
                      dataKey={student.name}
                      fill={colors[index % colors.length]}
                    />
                  ))}
                </BarChart>
              </div>
            </div>

            {/* 圓餅圖區域 - 每個學生都有自己的圓餅圖 */}
            <div className="col-span-1 lg:col-span-2">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4">各進度分布</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {students.map((student, studentIndex) => (
                    <div key={student.name} className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-medium mb-2 flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: colors[studentIndex % colors.length] }}
                        />
                        {student.name} 的進度分布
                        {student.name === currentUser.nickname && (
                          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">我</span>
                        )}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                        <Clock size={12} />
                        最後更新：{student.lastUpdated}
                      </div>
                      <PieChart width={300} height={200}>
                        <Pie
                          data={subjects.map(subject => ({
                            name: subject.name,
                            value: student.progress[subject.id],
                            total: subject.totalVideos
                          }))}
                          cx={150}
                          cy={100}
                          labelLine={false}
                          label={({ name, value, total }) => `${name}: ${value}/${total}`}
                          outerRadius={60}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {subjects.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 總進度概覽 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">總進度概覽</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {students.map((student, index) => {
                const totalProgress = getTotalProgress(student);
                const totalWatched = subjects.reduce((sum, subject) => sum + student.progress[subject.id], 0);
                const totalVideos = subjects.reduce((sum, subject) => sum + subject.totalVideos, 0);
                
                return (
                  <div key={student.name} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div 
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-xs"
                        style={{ backgroundColor: colors[index % colors.length] }}
                      >
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <h3 className="font-medium">{student.name}</h3>
                      {student.name === currentUser.nickname && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">我</span>
                      )}
                    </div>
                    <p className="text-2xl font-bold mb-1" style={{ color: colors[index % colors.length] }}>
                      {totalProgress}%
                    </p>
                    <p className="text-sm text-gray-500 mb-2">
                      {totalWatched} / {totalVideos} 部影片
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                      <Clock size={12} />
                      最後更新：{student.lastUpdated}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="h-3 rounded-full transition-all duration-300"
                        style={{
                          width: `${totalProgress}%`,
                          backgroundColor: colors[index % colors.length]
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StudyProgressTracker;