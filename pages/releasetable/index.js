import styles from "../../styles/table.module.css";
import Header from "../../components/Header";

export default function Home() {
  return (
    <div className={styles.main}>
      <div className={styles.main3}>
        <iframe className={styles.main2} src="releasetable.html" />
      </div>
    </div>
  );
}
