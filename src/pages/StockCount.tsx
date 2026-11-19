import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    ClipboardCheck,
    CheckCircle,
    AlertCircle,
    ArrowUpCircle,
    ArrowDownCircle,
    X,
    RotateCcw,
    Package,
} from 'lucide-react';
import { getAll } from '../database/sql-wrapper';
import type { Location } from '../database/types';
import {
    loadCountLines,
    lineDifference,
    summarizeCount,
    saveAndApplyCount,
    type CountLine,
} from '../utils/stockCount';
import { translateDbError } from '../utils/dbErrors';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SearchBar } from '../components/SearchBar';
import { EmptyState } from '../components/EmptyState';
import { StatsCard } from '../components/StatsCard';

type FilterStatus = 'all' | 'counted' | 'diff' | 'pending';

export function StockCount() {
    const [locations, setLocations] = useState<Location[]>([]);
    const [locationsError, setLocationsError] = useState<string | null>(null);
    const [locationId, setLocationId] = useState<number | null>(null);
    const [pendingLocationId, setPendingLocationId] = useState<number | null | undefined>(undefined);
    const [lines, setLines] = useState<CountLine[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

    const [reviewOpen, setReviewOpen] = useState(false);
    const [confirmApplyOpen, setConfirmApplyOpen] = useState(false);
    const [confirmClearOpen, setConfirmClearOpen] = useState(false);
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'warning'; message: string } | null>(null);

    const fetchLocations = useCallback(async () => {
        setLocationsError(null);
        try {
            const locs = await getAll<Location>('locations');
            locs.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
            setLocations(locs);
        } catch (err) {
            // Não bloqueia a contagem no estoque total se falhar ao listar locais,
            // mas informa o usuário para que ele saiba por que os locais não apareceram.
            const msg = err instanceof Error ? err.message : 'Erro ao carregar locais.';
            setLocationsError(translateDbError(msg));
        }
    }, []);

    const fetchLines = useCallback(async (targetLocationId: number | null) => {
        setLoading(true);
        setLoadError(null);
        try {
            const loaded = await loadCountLines(targetLocationId);
            loaded.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
            setLines(loaded);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erro ao carregar produtos para contagem.';
            setLoadError(translateDbError(msg));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLocations();
    }, [fetchLocations]);

    useEffect(() => {
        fetchLines(locationId);
    }, [locationId, fetchLines]);

    const summary = useMemo(() => summarizeCount(lines), [lines]);
    const unchangedCount = summary.counted - summary.withDifference;

    const diffLines = useMemo(
        () => lines.filter((line) => line.counted !== null && lineDifference(line) !== 0),
        [lines]
    );

    const filteredLines = useMemo(() => {
        const term = search.trim().toLowerCase();
        return lines.filter((line) => {
            if (term) {
                const matchName = line.name.toLowerCase().includes(term);
                const matchSku = line.sku.toLowerCase().includes(term);
                if (!matchName && !matchSku) return false;
            }
            if (filterStatus === 'counted') return line.counted !== null;
            if (filterStatus === 'pending') return line.counted === null;
            if (filterStatus === 'diff') return line.counted !== null && lineDifference(line) !== 0;
            return true;
        });
    }, [lines, search, filterStatus]);

    const selectedLocationName = useMemo(() => {
        if (locationId === null) return 'Estoque total';
        return locations.find((l) => l.id === locationId)?.name ?? 'Local selecionado';
    }, [locationId, locations]);

    function updateLineCount(productId: number, counted: number | null) {
        if (feedback) setFeedback(null);
        setLines((prev) =>
            prev.map((line) => (line.productId === productId ? { ...line, counted } : line))
        );
    }

    function handleCountInputChange(productId: number, raw: string) {
        if (raw === '') {
            updateLineCount(productId, null);
            return;
        }
        // Só aceita inteiros >= 0 para manter consistência com a validação do banco.
        if (/^\d+$/.test(raw)) {
            updateLineCount(productId, Number(raw));
        }
    }

    function handleLocationSelect(value: string) {
        const nextId = value === '' ? null : Number(value);
        if (nextId === locationId) return;
        // Evita perder números já digitados ao trocar de local sem querer.
        if (summary.counted > 0) {
            setPendingLocationId(nextId);
            return;
        }
        setFeedback(null);
        setLocationId(nextId);
    }

    function handleConfirmLocationChange() {
        if (pendingLocationId === undefined) return;
        const nextId = pendingLocationId;
        setPendingLocationId(undefined);
        setFeedback(null);
        setLocationId(nextId);
    }

    function handleClearCounts() {
        setConfirmClearOpen(false);
        setLines((prev) => prev.map((line) => ({ ...line, counted: null })));
    }

    function openReviewModal() {
        if (summary.counted === 0) return;
        setSaveError(null);
        setReviewOpen(true);
    }

    async function handleApplyCount() {
        if (saving) return;
        setConfirmApplyOpen(false);
        setSaveError(null);
        setSaving(true);
        try {
            const result = await saveAndApplyCount(lines, locationId, notes.trim());
            setReviewOpen(false);
            setNotes('');
            await fetchLines(locationId);

            if (!result.applied) {
                setFeedback({
                    type: 'warning',
                    message: result.reason || 'Esta contagem já foi aplicada anteriormente.',
                });
            } else if (result.adjusted > 0) {
                setFeedback({
                    type: 'success',
                    message: `Contagem aplicada! ${result.adjusted} ${result.adjusted === 1 ? 'produto ajustado' : 'produtos ajustados'} no estoque.`,
                });
            } else {
                setFeedback({
                    type: 'success',
                    message: 'Contagem registrada! Todos os itens conferiram com o esperado, sem ajustes necessários.',
                });
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erro desconhecido ao aplicar a contagem.';
            setSaveError(translateDbError(msg));
        } finally {
            setSaving(false);
        }
    }

    function renderDifference(line: CountLine) {
        if (line.counted === null) {
            return <span className="text-muted">—</span>;
        }
        const diff = lineDifference(line);
        if (diff > 0) {
            return (
                <span className="badge badge-success tabular-nums">
                    +{diff} {line.unit} (sobra)
                </span>
            );
        }
        if (diff < 0) {
            return (
                <span className="badge badge-danger tabular-nums">
                    {diff} {line.unit} (falta)
                </span>
            );
        }
        return (
            <span className="badge badge-neutral tabular-nums">
                0 {line.unit} (igual)
            </span>
        );
    }

    return (
        <>
            <div className="stats-grid stock-count-stats">
                <StatsCard
                    icon={ClipboardCheck}
                    label="Contados"
                    value={`${summary.counted}/${summary.total}`}
                    color="purple"
                />
                <StatsCard
                    icon={AlertCircle}
                    label="Com diferença"
                    value={summary.withDifference}
                    color="yellow"
                />
                <StatsCard
                    icon={ArrowUpCircle}
                    label="Sobras (+)"
                    value={summary.surplus > 0 ? `+${summary.surplus}` : '0'}
                    color="green"
                />
                <StatsCard
                    icon={ArrowDownCircle}
                    label="Faltas (-)"
                    value={summary.shortage > 0 ? `-${summary.shortage}` : '0'}
                    color="red"
                />
            </div>

            <div className="toolbar">
                <div className="toolbar-left stock-count-toolbar-left">
                    <SearchBar
                        value={search}
                        onChange={setSearch}
                        placeholder="Buscar por nome ou SKU..."
                    />
                    <select
                        className="form-select stock-count-select"
                        aria-label="Local de contagem"
                        value={locationId ?? ''}
                        onChange={(e) => handleLocationSelect(e.target.value)}
                        disabled={loading || saving}
                    >
                        <option value="">Estoque total</option>
                        {locations.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                                {loc.name}
                            </option>
                        ))}
                    </select>
                    <select
                        className="form-select stock-count-filter"
                        aria-label="Filtrar itens"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                    >
                        <option value="all">Todos ({lines.length})</option>
                        <option value="counted">Contados ({summary.counted})</option>
                        <option value="diff">Com diferença ({summary.withDifference})</option>
                        <option value="pending">Não contados ({summary.total - summary.counted})</option>
                    </select>
                </div>
                <div className="toolbar-right stock-count-toolbar-right">
                    {summary.counted > 0 && (
                        <button
                            className="btn btn-secondary"
                            onClick={() => setConfirmClearOpen(true)}
                            disabled={saving}
                        >
                            <RotateCcw size={16} /> Limpar
                        </button>
                    )}
                    <button
                        className="btn btn-primary"
                        onClick={openReviewModal}
                        disabled={summary.counted === 0 || loading || saving}
                    >
                        <ClipboardCheck size={16} /> Revisar e confirmar ({summary.counted})
                    </button>
                </div>
            </div>

            {feedback && (
                <div className={`stock-count-banner ${feedback.type}`}>
                    <div className="stock-count-banner-content">
                        {feedback.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                        <span>{feedback.message}</span>
                    </div>
                    <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => setFeedback(null)}
                        aria-label="Fechar aviso"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            {locationsError && (
                <div className="stock-count-banner warning">
                    <div className="stock-count-banner-content">
                        <AlertCircle size={16} />
                        <span>Não foi possível carregar os locais: {locationsError}</span>
                    </div>
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={fetchLocations}
                    >
                        Tentar novamente
                    </button>
                </div>
            )}

            {loadError && (
                <div className="stock-count-banner danger">
                    <div className="stock-count-banner-content">
                        <AlertCircle size={16} />
                        <span>{loadError}</span>
                    </div>
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => fetchLines(locationId)}
                    >
                        Tentar novamente
                    </button>
                </div>
            )}

            {loading ? (
                <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <p className="text-muted">Carregando produtos para contagem...</p>
                </div>
            ) : lines.length === 0 ? (
                <EmptyState
                    icon={Package}
                    title="Nenhum produto cadastrado"
                    description="Cadastre produtos na tela de Produtos para iniciar uma contagem de estoque."
                />
            ) : filteredLines.length === 0 ? (
                <EmptyState
                    icon={ClipboardCheck}
                    title="Nenhum produto encontrado"
                    description="Nenhum item corresponde à busca ou ao filtro selecionado."
                    action={
                        (search || filterStatus !== 'all') ? (
                            <button
                                className="btn btn-secondary"
                                onClick={() => {
                                    setSearch('');
                                    setFilterStatus('all');
                                }}
                            >
                                Limpar filtros
                            </button>
                        ) : undefined
                    }
                />
            ) : (
                <div className="table-container">
                    <table className="table stock-count-table">
                        <thead>
                            <tr>
                                <th>Produto</th>
                                <th className="text-right">Esperado</th>
                                <th className="text-right" style={{ width: '160px' }}>Contado</th>
                                <th className="text-right">Diferença</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLines.map((line) => (
                                <tr key={line.productId}>
                                    <td className="stock-count-cell-product">
                                        <div style={{ fontWeight: 500 }}>{line.name}</div>
                                        <div style={{ fontSize: '12px' }} className="text-muted font-mono">
                                            {line.sku}
                                        </div>
                                    </td>
                                    <td className="text-right tabular-nums">
                                        <span className="stock-count-mobile-label">Esperado</span>
                                        <span style={{ fontWeight: 500 }}>
                                            {line.expected} {line.unit}
                                        </span>
                                    </td>
                                    <td className="text-right">
                                        <span className="stock-count-mobile-label">Contado ({line.unit})</span>
                                        <div className="stock-count-input-wrap">
                                            <input
                                                type="number"
                                                min={0}
                                                step={1}
                                                inputMode="numeric"
                                                aria-label={`Quantidade contada de ${line.name}`}
                                                className="form-input stock-count-input"
                                                placeholder="—"
                                                value={line.counted !== null ? String(line.counted) : ''}
                                                onKeyDown={(e) => {
                                                    if (['-', '+', 'e', 'E', '.', ','].includes(e.key)) {
                                                        e.preventDefault();
                                                    }
                                                }}
                                                onChange={(e) => handleCountInputChange(line.productId, e.target.value)}
                                            />
                                            {line.counted !== null && (
                                                <button
                                                    type="button"
                                                    className="btn btn-ghost btn-icon btn-sm"
                                                    title="Limpar campo"
                                                    aria-label={`Limpar contagem de ${line.name}`}
                                                    onClick={() => updateLineCount(line.productId, null)}
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td className="text-right stock-count-cell-diff">
                                        <span className="stock-count-mobile-label">Diferença</span>
                                        {renderDifference(line)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {reviewOpen && (
                <Modal
                    title="Resumo da contagem"
                    className="modal-wide"
                    onClose={() => { if (!saving) setReviewOpen(false); }}
                    footer={
                        <>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setReviewOpen(false)}
                                disabled={saving}
                            >
                                Voltar
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={() => setConfirmApplyOpen(true)}
                                disabled={saving}
                            >
                                {saving ? 'Aplicando ajustes...' : 'Confirmar contagem'}
                            </button>
                        </>
                    }
                >
                    <div className="stock-count-review-summary">
                        <div className="stock-count-review-headline">
                            <span style={{ fontWeight: 600, fontSize: '15px' }}>
                                {summary.withDifference}{' '}
                                {summary.withDifference === 1 ? 'item com diferença' : 'itens com diferença'}
                            </span>
                            <span className="badge badge-purple">{selectedLocationName}</span>
                        </div>
                        <div className="stock-count-review-metrics">
                            <span className="badge badge-info tabular-nums">
                                {summary.counted} de {summary.total} contados
                            </span>
                            <span className="badge badge-neutral tabular-nums">
                                {unchangedCount} {unchangedCount === 1 ? 'igual ao esperado' : 'iguais ao esperado'}
                            </span>
                            {summary.surplus > 0 && (
                                <span className="badge badge-success tabular-nums">
                                    Sobra total: +{summary.surplus}
                                </span>
                            )}
                            {summary.shortage > 0 && (
                                <span className="badge badge-danger tabular-nums">
                                    Falta total: -{summary.shortage}
                                </span>
                            )}
                        </div>
                    </div>

                    {diffLines.length > 0 ? (
                        <div>
                            <div className="form-label mb-1">Ajustes que serão gerados</div>
                            <div className="stock-count-review-list">
                                {diffLines.map((line) => (
                                    <div key={line.productId} className="list-item" style={{ justifyContent: 'space-between' }}>
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                            <div style={{ fontWeight: 500 }} className="truncate">{line.name}</div>
                                            <div style={{ fontSize: '12px' }} className="text-muted tabular-nums">
                                                {line.sku} • Esperado: {line.expected} {line.unit} → Contado: {line.counted} {line.unit}
                                            </div>
                                        </div>
                                        <div style={{ flexShrink: 0 }}>
                                            {renderDifference(line)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="stock-count-banner success" style={{ marginBottom: 0 }}>
                            <div className="stock-count-banner-content">
                                <CheckCircle size={16} />
                                <span>
                                    Todos os itens contados estão iguais ao esperado. Nenhum ajuste de estoque será gerado.
                                </span>
                            </div>
                        </div>
                    )}

                    {unchangedCount > 0 && diffLines.length > 0 && (
                        <p className="text-muted" style={{ fontSize: '12.5px' }}>
                            {unchangedCount}{' '}
                            {unchangedCount === 1
                                ? 'item conferido sem diferença não gera movimentação de ajuste.'
                                : 'itens conferidos sem diferença não geram movimentação de ajuste.'}
                        </p>
                    )}

                    <div className="form-group">
                        <label className="form-label" htmlFor="stock-count-notes">
                            Observações (opcional)
                        </label>
                        <textarea
                            id="stock-count-notes"
                            className="form-textarea"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ex.: Inventário mensal, conferência de depósito..."
                            disabled={saving}
                        />
                    </div>

                    {saveError && (
                        <div className="stock-count-banner danger" style={{ marginBottom: 0 }}>
                            <div className="stock-count-banner-content">
                                <AlertCircle size={16} />
                                <span>{saveError}</span>
                            </div>
                        </div>
                    )}
                </Modal>
            )}

            {confirmApplyOpen && (
                <ConfirmDialog
                    title="Confirmar contagem"
                    message={
                        summary.withDifference > 0
                            ? `${summary.withDifference} ${summary.withDifference === 1 ? 'item com diferença' : 'itens com diferença'} em "${selectedLocationName}". Ao confirmar, o estoque será ajustado e as movimentações serão registradas.`
                            : `Nenhum item apresentou diferença em "${selectedLocationName}". Nenhum ajuste de estoque será gerado. Deseja registrar a contagem?`
                    }
                    confirmLabel="Aplicar contagem"
                    onConfirm={handleApplyCount}
                    onCancel={() => setConfirmApplyOpen(false)}
                />
            )}

            {pendingLocationId !== undefined && (
                <ConfirmDialog
                    title="Trocar local de contagem?"
                    message={`Você já contou ${summary.counted} ${summary.counted === 1 ? 'produto' : 'produtos'}. Ao trocar de local, os números digitados serão descartados.`}
                    confirmLabel="Trocar local"
                    onConfirm={handleConfirmLocationChange}
                    onCancel={() => setPendingLocationId(undefined)}
                />
            )}

            {confirmClearOpen && (
                <ConfirmDialog
                    title="Limpar contagem"
                    message={`Deseja limpar os ${summary.counted} ${summary.counted === 1 ? 'campo preenchido' : 'campos preenchidos'}? Nenhum dado foi salvo ainda.`}
                    confirmLabel="Limpar"
                    onConfirm={handleClearCounts}
                    onCancel={() => setConfirmClearOpen(false)}
                />
            )}
        </>
    );
}
