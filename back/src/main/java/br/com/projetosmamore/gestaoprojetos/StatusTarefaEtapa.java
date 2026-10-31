package br.com.projetosmamore.gestaoprojetos;

/**
 * Status da tarefa da etapa. Toda tarefa nasce Em espera; Concluída é o mesmo que marcada como feita
 * no checklist (os dois andam juntos).
 */
public enum StatusTarefaEtapa {
    EM_ESPERA, EM_PAUSA, EM_ANDAMENTO, CONCLUIDA
}
