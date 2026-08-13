import { useState, useEffect, useCallback } from 'react';
import { getAll, insert, updateById, deleteById } from '../database/sql-wrapper';

interface UseCrudOptions<T extends { id?: number }, Form> {
    table: string;
    emptyForm: Form;
    // Converte um item vindo do banco para o formato usado no formulário de edição
    toForm: (item: T) => Form;
    // Converte o formulário em um registro pronto para salvar no banco.
    // isNew diferencia criação de edição (ex: só adicionar createdAt em criação)
    toRecord?: (form: Form, isNew: boolean) => Record<string, any>;
    // Roda depois do getAll(), útil para enriquecer os itens com dados de outras tabelas
    transform?: (items: T[]) => Promise<T[]> | T[];
    // Roda antes de excluir; retornar uma string bloqueia a exclusão e mostra o erro
    beforeDelete?: (item: T) => Promise<string | null> | string | null;
}

export function useCrud<T extends { id?: number }, Form>(options: UseCrudOptions<T, Form>) {
    const [items, setItems] = useState<T[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<T | null>(null);
    const [form, setForm] = useState<Form>(options.emptyForm);
    const [deleteTarget, setDeleteTarget] = useState<T | null>(null);

    const loadData = useCallback(async () => {
        const rows = await getAll<T>(options.table);
        const finalRows = options.transform ? await options.transform(rows) : rows;
        setItems(finalRows);
    }, [options.table]);

    useEffect(() => { loadData(); }, [loadData]);

    function openNew() {
        setEditing(null);
        setForm(options.emptyForm);
        setModalOpen(true);
    }

    function openEdit(item: T) {
        setEditing(item);
        setForm(options.toForm(item));
        setModalOpen(true);
    }

    async function handleSave() {
        const isNew = !editing?.id;
        const record = options.toRecord ? options.toRecord(form, isNew) : form;
        if (editing?.id) {
            await updateById(options.table, editing.id, record as Record<string, any>);
        } else {
            await insert(options.table, record as Record<string, any>);
        }
        setModalOpen(false);
        await loadData();
    }

    async function handleDelete() {
        if (deleteTarget?.id) {
            if (options.beforeDelete) {
                const error = await options.beforeDelete(deleteTarget);
                if (error) {
                    alert(error);
                    setDeleteTarget(null);
                    return;
                }
            }
            await deleteById(options.table, deleteTarget.id);
        }
        setDeleteTarget(null);
        await loadData();
    }

    return {
        items, loadData,
        modalOpen, setModalOpen,
        editing, form, setForm,
        deleteTarget, setDeleteTarget,
        openNew, openEdit, handleSave, handleDelete,
    };
}
