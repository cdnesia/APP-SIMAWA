export interface EdomPilihan {
  urut: number;
  ket: string;
}

export interface EdomSoal {
  idListsoal: number;
  tipeSoal: string;
  pertanyaan: string;
  pilihan: EdomPilihan[];
}

export interface EdomFormResponse {
  jadwalId: string;
  kodeTahunAkademik: string;
  kodeMataKuliah: string | null;
  namaMataKuliah: string | null;
  dosenId: number | null;
  namaDosen: string | null;
  sudahEdom: boolean;
  daftarSoal: EdomSoal[];
}

export interface EdomJawabanPayload {
  idListsoal: number;
  tipeSoal: string;
  jawaban?: string;
  jawabanEsay?: string;
}
