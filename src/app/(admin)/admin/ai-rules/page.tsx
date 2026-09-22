'use client';

import { useEffect, useState } from 'react';
import styles from './AIRules.module.css';

interface AIRule {
  id: string;
  level: string;
  content: string;
  updated_at: string;
}

const LEVELS = [
  { key: 'common', label: '공통 기준' },
  { key: '초', label: '초등학교' },
  { key: '중', label: '중학교' },
  { key: '고', label: '고등학교' },
];

export default function AIRules() {
  const [rules, setRules] = useState<AIRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingLevel, setEditingLevel] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const res = await fetch('/api/admin/ai-rules');
      const data = await res.json();
      if (data.success) {
        setRules(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch rules:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (rule: AIRule) => {
    setEditingLevel(rule.level);
    setEditContent(rule.content);
    setError('');
    setSuccess('');
  };

  const handleSave = async () => {
    if (!editingLevel || !editContent.trim()) {
      setError('내용을 입력하세요.');
      return;
    }

    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/admin/ai-rules/${editingLevel}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess('규칙이 저장되었습니다.');
        setEditingLevel(null);
        fetchRules();
      } else {
        setError(data.error || '저장에 실패했습니다.');
      }
    } catch (err) {
      setError('서버 오류가 발생했습니다.');
      console.error('Save error:', err);
    }
  };

  return (
    <div className={styles.container}>
      <h1>AI 규칙 관리</h1>
      <p className={styles.subtitle}>
        AI의 답변 기준을 설정합니다. 학생에게 어떻게 대응할지 정의합니다.
      </p>

      {loading ? (
        <div className={styles.loading}>로드 중...</div>
      ) : (
        <div className={styles.rulesGrid}>
          {LEVELS.map((level) => {
            const rule = rules.find((r) => r.level === level.key);
            const isEditing = editingLevel === level.key;

            return (
              <div key={level.key} className={styles.ruleCard}>
                <h3>{level.label}</h3>

                {isEditing ? (
                  <div className={styles.editForm}>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={6}
                      placeholder="AI 규칙을 입력하세요..."
                    />
                    {error && <div className={styles.error}>{error}</div>}
                    {success && <div className={styles.success}>{success}</div>}
                    <div className={styles.buttonGroup}>
                      <button className={styles.saveBtn} onClick={handleSave}>
                        💾 저장
                      </button>
                      <button
                        className={styles.cancelBtn}
                        onClick={() => setEditingLevel(null)}
                      >
                        ✕ 취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.ruleContent}>
                    <p>{rule?.content || '설정된 규칙이 없습니다.'}</p>
                    <div className={styles.footer}>
                      {rule && (
                        <small>
                          수정: {new Date(rule.updated_at).toLocaleDateString('ko-KR')}
                        </small>
                      )}
                      <button
                        className={styles.editBtn}
                        onClick={() => handleEdit(rule || { id: '', level: level.key, content: '', updated_at: new Date().toISOString() })}
                      >
                        ✏️ 수정
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
