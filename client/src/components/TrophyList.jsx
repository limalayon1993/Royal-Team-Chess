import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { translations } from '../translations';
import './TrophyList.css';

const TrophyList = ({ entityId, type, title, language = 'en' }) => {
    const [trophies, setTrophies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTrophy, setSelectedTrophy] = useState(null);
    const t = translations[language];

    const fetchTrophies = async () => {
        setLoading(true);
        try {
            const tableName = type === 'CLUB' ? 'club_trophies' : 'player_trophies';
            const idColumn = type === 'CLUB' ? 'club_id' : 'user_id';

            const { data, error } = await supabase
                .from(tableName)
                .select(`
                    id,
                    awarded_at,
                    season_id,
                    trophy:trophies (
                        id,
                        name,
                        description,
                        image_url,
                        type
                    )
                `)
                .eq(idColumn, entityId)
                .order('awarded_at', { ascending: false });

            if (error) {
                console.error('Error fetching trophies:', error);
            } else {
                groupTrophies(data);
            }
        } catch (e) {
            console.error('Exception fetching trophies:', e);
        } finally {
            setLoading(false);
        }
    };

    const groupTrophies = (data) => {
        const groups = {};
        data.forEach(award => {
            const tId = award.trophy?.id;
            if (!tId) return;

            if (!groups[tId]) {
                groups[tId] = {
                    definition: award.trophy,
                    awards: []
                };
            }
            groups[tId].awards.push(award);
        });

        // Convert to array
        setTrophies(Object.values(groups));
    };

    useEffect(() => {
        if (entityId && type) {
            fetchTrophies();
        }
    }, [entityId, type]);


    if (loading) return <div className="trophy-loading">{t.trophyLoading}</div>;
    if (trophies.length === 0) return <div className="trophy-empty">{t.trophyEmpty}</div>;

    return (
        <div className="trophy-container">
            <h3>{title || t.trophyTitle}</h3>
            <div className="trophy-grid">
                {trophies.map((group) => (
                    <div
                        key={group.definition.id}
                        className="trophy-item"
                        onClick={() => setSelectedTrophy(group)}
                    >
                        <div className="trophy-image-wrapper">
                            <img
                                src={group.definition.image_url || '/assets/trophies/default.png'}
                                alt={group.definition.name}
                                className="trophy-img"
                                onError={(e) => { e.target.onerror = null; e.target.src = '/assets/trophies/default_trophy.png'; }}
                            />
                        </div>
                        <div className="trophy-count-badge">
                            {group.awards.length > 1 && `x${group.awards.length}`}
                        </div>
                        <div className="trophy-name-preview">{group.definition.name}</div>
                    </div>
                ))}
            </div>

            {selectedTrophy && (
                <div className="trophy-modal-overlay" onClick={() => setSelectedTrophy(null)}>
                    <div className="trophy-modal" onClick={e => e.stopPropagation()}>
                        <button className="trophy-close-btn" onClick={() => setSelectedTrophy(null)}>×</button>

                        <div className="trophy-modal-header">
                            <img
                                src={selectedTrophy.definition.image_url}
                                alt={selectedTrophy.definition.name}
                                className="trophy-modal-img"
                            />
                            <h2>{selectedTrophy.definition.name}</h2>
                        </div>

                        <div className="trophy-modal-body">
                            <p className="trophy-desc">{selectedTrophy.definition.description}</p>

                            <div className="trophy-history">
                                <h4>{t.victoryHistory}</h4>
                                <ul>
                                    {selectedTrophy.awards.map((award) => (
                                        <li key={award.id}>
                                            <span className="trophy-date">
                                                {new Date(award.awarded_at).toLocaleDateString()}
                                            </span>
                                            {award.season_id && (
                                                <span className="trophy-season"> ({t.season} {award.season_id})</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TrophyList;
